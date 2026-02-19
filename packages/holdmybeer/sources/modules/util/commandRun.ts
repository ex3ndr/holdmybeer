import { spawn } from "node:child_process";
import { textFormatKey } from "@text";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

export interface CommandRunOptions {
  cwd?: string;
  timeoutMs?: number | null;
  input?: string;
  allowFailure?: boolean;
  onStdoutText?: (text: string) => void;
  onStderrText?: (text: string) => void;
  sandbox?: CommandSandbox;
  env?: Record<string, string>;
}

export interface CommandRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a command and captures stdout/stderr.
 * Throws on non-zero exit unless allowFailure is true.
 */
export async function commandRun(
  command: string,
  args: string[],
  options: CommandRunOptions = {}
): Promise<CommandRunResult> {
  const timeoutMs = options.timeoutMs === undefined ? 60_000 : options.timeoutMs;
  const cwdResolved = options.cwd ?? pathResolveFromInitCwd(".");
  const displayCommand = `${command} ${args.join(" ")}`;
  const abortController = new AbortController();
  const invocation = await commandInvocationResolve(
    command,
    args,
    cwdResolved,
    options,
    abortController.signal
  );

  const result = await new Promise<CommandRunResult>((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, invocation.spawnOptions);

    let stdout = "";
    let stderr = "";
    let settled = false;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs !== null) {
      timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        abortController.abort();
        child.kill("SIGTERM");
        reject(
          new Error(
            textFormatKey("error_command_timeout", {
              ms: timeoutMs,
              command: displayCommand
            })
          )
        );
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      stdout += text;
      options.onStdoutText?.(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      stderr += text;
      options.onStderrText?.(text);
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });

  if (!options.allowFailure && result.exitCode !== 0) {
    throw new Error(
      textFormatKey("error_command_failed", {
        code: result.exitCode,
        command: displayCommand
      }) + `\n${result.stderr || result.stdout}`
    );
  }

  return result;
}

async function commandInvocationResolve(
  command: string,
  args: string[],
  cwd: string,
  options: CommandRunOptions,
  abortSignal: AbortSignal
): Promise<{
  command: string;
  args: string[];
  spawnOptions: {
    cwd?: string;
    stdio: "pipe";
    env: NodeJS.ProcessEnv;
    shell?: boolean;
  };
}> {
  const env = options.env
    ? { ...process.env, ...options.env }
    : process.env;

  if (!options.sandbox) {
    return {
      command,
      args,
      spawnOptions: {
        cwd,
        stdio: "pipe",
        env
      }
    };
  }

  const shellCommand = commandShellBuild(command, args);
  const sandboxedCommand = await options.sandbox.wrapCommand(shellCommand, abortSignal);
  return {
    command: sandboxedCommand,
    args: [],
    spawnOptions: {
      cwd,
      stdio: "pipe",
      env,
      shell: true
    }
  };
}

function commandShellBuild(command: string, args: string[]): string {
  const commandParts = [command, ...args].map((part) => commandShellQuote(part));
  return commandParts.join(" ");
}

function commandShellQuote(value: string): string {
  if (/^[A-Za-z0-9_/.:-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}
