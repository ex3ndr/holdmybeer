import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { providerGenerate } from "@/modules/ai/providerGenerate.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";

const TEST_TIMEOUT_MS = 180_000;

function commandExists(command: string): boolean {
    const result = spawnSync("zsh", ["-lc", `command -v ${command}`], {
        encoding: "utf-8"
    });
    return result.status === 0;
}

function assertNoPiFlagParseError(stderr: string): void {
    expect(stderr).not.toContain("unknown option '--mode'");
    expect(stderr).not.toContain("unknown option '--print'");
}

async function runReadOnly(command: string): Promise<void> {
    const sandbox = await sandboxInferenceGet({
        writePolicy: { mode: "read-only" }
    });
    const result = await providerGenerate({
        providerId: "pi",
        command,
        prompt: "Reply with <output>ok</output> only.",
        sandbox,
        writePolicy: { mode: "read-only" }
    });

    if (!result.output) {
        const stderr = result.failure?.stderr ?? "";
        assertNoPiFlagParseError(stderr);
        expect(stderr.length).toBeGreaterThan(0);
        return;
    }

    expect(result.output.trim().length).toBeGreaterThan(0);
}

async function runSingleFileAllowed(command: string): Promise<void> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-provider-generate-"));
    try {
        const outputFile = path.join(tempDir, "result.txt");
        const sandbox = await sandboxInferenceGet({
            writePolicy: {
                mode: "write-whitelist",
                writablePaths: [outputFile]
            }
        });

        const result = await providerGenerate({
            providerId: "pi",
            command,
            prompt: [
                `Write EXACTLY this text to ${outputFile}: hello-from-provider`,
                "Do not write to any other file.",
                "You may return plain confirmation text."
            ].join("\n"),
            sandbox,
            writePolicy: {
                mode: "write-whitelist",
                writablePaths: [outputFile]
            },
            requireOutputTags: false
        });

        if (result.failure) {
            assertNoPiFlagParseError(result.failure.stderr);
            expect(result.failure.stderr.length).toBeGreaterThan(0);
            return;
        }

        const written = await readFile(outputFile, "utf-8");
        expect(written).toContain("hello-from-provider");
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

async function runRetryInSameSession(): Promise<void> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-provider-generate-retry-"));
    const wrapperPath = path.join(tempDir, "pi-wrapper.sh");
    const statePath = path.join(tempDir, "state.txt");
    const argsPath = path.join(tempDir, "args.log");
    const stateEnvPrevious = process.env.HMB_STATE_FILE;
    const argsEnvPrevious = process.env.HMB_ARGS_LOG;

    try {
        await writeFile(
            wrapperPath,
            [
                "#!/usr/bin/env bash",
                'state_file="$HMB_STATE_FILE"',
                'args_file="$HMB_ARGS_LOG"',
                'if [ -z "$state_file" ] || [ -z "$args_file" ]; then',
                "  echo 'missing HMB_STATE_FILE or HMB_ARGS_LOG' >&2",
                "  exit 1",
                "fi",
                "count=0",
                'if [ -f "$state_file" ]; then',
                '  count=$(cat "$state_file")',
                "fi",
                "count=$((count + 1))",
                'echo "$count" > "$state_file"',
                "{",
                '  for arg in "$@"; do',
                "    printf '%s\\t' \"$arg\"",
                "  done",
                "  printf '\\n'",
                '} >> "$args_file"',
                "",
                'pi "$@"',
                'if [ "$count" -eq 1 ]; then',
                '  echo \'{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"retry-without-tags"}]}}\'',
                "fi",
                'if [ "$count" -eq 2 ]; then',
                '  echo \'{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"<output>ok</output>"}]}}\'',
                "fi",
                "exit 0",
                ""
            ].join("\n"),
            "utf-8"
        );
        await chmod(wrapperPath, 0o755);
        process.env.HMB_STATE_FILE = statePath;
        process.env.HMB_ARGS_LOG = argsPath;

        const sandbox = await sandboxInferenceGet({
            writePolicy: { mode: "read-only" }
        });

        const result = await providerGenerate({
            providerId: "pi",
            command: wrapperPath,
            prompt: "Return <output>ok</output> only.",
            sandbox,
            writePolicy: { mode: "read-only" }
        });

        const argsLog = await readFile(argsPath, "utf-8");
        const calls = argsLog
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => line.split("\t").filter((part) => part.length > 0));

        expect(calls.length).toBe(2);
        expect(calls[0]).not.toContain("--continue");
        expect(calls[1]).toContain("--continue");

        const firstSessionDir = sessionDirFromArgs(calls[0]!);
        const secondSessionDir = sessionDirFromArgs(calls[1]!);
        expect(firstSessionDir).toBeTruthy();
        expect(secondSessionDir).toBe(firstSessionDir);
        if (!result.output) {
            assertNoPiFlagParseError(result.failure?.stderr ?? "");
        }
    } finally {
        if (stateEnvPrevious === undefined) {
            delete process.env.HMB_STATE_FILE;
        } else {
            process.env.HMB_STATE_FILE = stateEnvPrevious;
        }
        if (argsEnvPrevious === undefined) {
            delete process.env.HMB_ARGS_LOG;
        } else {
            process.env.HMB_ARGS_LOG = argsEnvPrevious;
        }
        await rm(tempDir, { recursive: true, force: true });
    }
}

function sessionDirFromArgs(args: string[]): string | undefined {
    const index = args.indexOf("--session-dir");
    return index >= 0 ? args[index + 1] : undefined;
}

describe("providerGenerate pi integration", () => {
    it(
        "runs in read-only sandbox without mock command execution",
        async () => {
            expect(commandExists("pi")).toBe(true);
            await runReadOnly("pi");
        },
        TEST_TIMEOUT_MS
    );

    it(
        "runs in single-file write-whitelist sandbox without mock command execution",
        async () => {
            expect(commandExists("pi")).toBe(true);
            await runSingleFileAllowed("pi");
        },
        TEST_TIMEOUT_MS
    );

    it(
        "retries by continuing the same pi session",
        async () => {
            expect(commandExists("pi")).toBe(true);
            await runRetryInSameSession();
        },
        TEST_TIMEOUT_MS
    );
});
