import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
});
