import { spawn } from "node:child_process";
import { textFormatKey } from "@text";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

export interface CommandJSONLInput {
    command: string;
    args: string[];
    sandbox: CommandSandbox;
    abortSignal?: AbortSignal;
    cwd?: string;
    timeoutMs?: number | null;
    env?: Record<string, string>;
    onStdoutText?: (text: string) => void;
    onStderrText?: (text: string) => void;
    onJsonlEvent?: (event: unknown) => void;
}

export interface CommandJSONLResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

/**
 * Runs a sandboxed CLI command, streams stdout/stderr, and emits parsed JSONL events.
 * Expects: stdout emits JSON Lines; malformed JSON lines are ignored.
 */
export async function commandJSONL(input: CommandJSONLInput): Promise<CommandJSONLResult> {
    const timeoutMs = input.timeoutMs === undefined ? 60_000 : input.timeoutMs;
    const cwdResolved = input.cwd ?? pathResolveFromInitCwd(".");
    const displayCommand = `${input.command} ${input.args.join(" ")}`;
    const timeoutAbortController = new AbortController();
    const abortSignal = commandJSONLAbortSignalResolve(input.abortSignal, timeoutAbortController.signal);
    const invocation = await commandJSONLInvocationResolve(input.command, input.args, cwdResolved, input, abortSignal);

    return await new Promise<CommandJSONLResult>((resolve, reject) => {
        const child = spawn(invocation.command, invocation.args, invocation.spawnOptions);

        let stdout = "";
        let stderr = "";
        let stdoutBuffer = "";
        let settled = false;

        const abortHandler = (): void => {
            child.kill("SIGTERM");
        };
        abortSignal.addEventListener("abort", abortHandler);

        let timeout: ReturnType<typeof setTimeout> | undefined;
        if (timeoutMs !== null) {
            timeout = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                timeoutAbortController.abort();
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

        const cleanup = (): void => {
            if (timeout) {
                clearTimeout(timeout);
            }
            abortSignal.removeEventListener("abort", abortHandler);
        };

        child.stdout.on("data", (chunk: Buffer) => {
            if (settled) {
                return;
            }
            const text = chunk.toString("utf-8");
            stdout += text;
            input.onStdoutText?.(text);

            try {
                stdoutBuffer = commandJSONLChunkProcess(stdoutBuffer, text, (event) => {
                    input.onJsonlEvent?.(event);
                });
            } catch (error) {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                timeoutAbortController.abort();
                reject(error);
            }
        });

        child.stderr.on("data", (chunk: Buffer) => {
            if (settled) {
                return;
            }
            const text = chunk.toString("utf-8");
            stderr += text;
            input.onStderrText?.(text);
        });

        child.on("error", (error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(error);
        });

        child.on("close", (code) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                commandJSONLLineProcess(stdoutBuffer, (event) => {
                    input.onJsonlEvent?.(event);
                });
            } catch (error) {
                reject(error);
                return;
            }

            resolve({
                exitCode: code ?? 1,
                stdout,
                stderr
            });
        });

        child.stdin.end();
    });
}

function commandJSONLAbortSignalResolve(inputSignal: AbortSignal | undefined, timeoutSignal: AbortSignal): AbortSignal {
    if (!inputSignal) {
        return timeoutSignal;
    }
    return AbortSignal.any([inputSignal, timeoutSignal]);
}

async function commandJSONLInvocationResolve(
    command: string,
    args: string[],
    cwd: string,
    input: CommandJSONLInput,
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
    const env = input.env ? { ...process.env, ...input.env } : process.env;
    const shellCommand = commandJSONLShellBuild(command, args);
    const sandboxedCommand = await input.sandbox.wrapCommand(shellCommand, abortSignal);
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

function commandJSONLShellBuild(command: string, args: string[]): string {
    return [command, ...args].map((part) => commandJSONLShellQuote(part)).join(" ");
}

function commandJSONLShellQuote(value: string): string {
    if (/^[A-Za-z0-9_/.:-]+$/.test(value)) {
        return value;
    }

    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function commandJSONLChunkProcess(buffer: string, chunk: string, onEvent: (event: unknown) => void): string {
    const combined = `${buffer}${chunk}`;
    const lines = combined.split(/\r?\n/);
    const remainder = lines.pop() ?? "";
    for (const line of lines) {
        commandJSONLLineProcess(line, onEvent);
    }
    return remainder;
}

function commandJSONLLineProcess(line: string, onEvent: (event: unknown) => void): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
        return;
    }
    try {
        onEvent(JSON.parse(trimmed));
    } catch {
        // JSONL streams often include non-JSON diagnostics; skip invalid lines.
    }
}
