import { spawn } from "node:child_process";

export interface CommandRunOptions {
  cwd?: string;
  timeoutMs?: number;
  input?: string;
  allowFailure?: boolean;
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
  const timeoutMs = options.timeoutMs ?? 60_000;

  const result = await new Promise<CommandRunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: "pipe",
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
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
      `Command failed (${result.exitCode}): ${command} ${args.join(" ")}\n${result.stderr || result.stdout}`
    );
  }

  return result;
}
