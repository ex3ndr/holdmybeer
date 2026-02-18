import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProviderId } from "@/types";
import { providerGenerate } from "@/modules/ai/providerGenerate.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";

const TEST_TIMEOUT_MS = 180_000;

function commandExists(command: string): boolean {
  const result = spawnSync("zsh", ["-lc", `command -v ${command}`], {
    encoding: "utf-8"
  });
  return result.status === 0;
}

function providerFlag(providerId: ProviderId): string {
  return providerId === "claude"
    ? "--dangerously-skip-permissions"
    : "--dangerously-bypass-approvals-and-sandbox";
}

function assertNoProviderFlagParseError(providerId: ProviderId, stderr: string): void {
  const flag = providerFlag(providerId);
  expect(stderr).not.toContain(`unexpected argument '${flag}'`);
  expect(stderr).not.toContain(`unrecognized option '${flag}'`);
}

async function runReadOnly(providerId: ProviderId, command: string): Promise<void> {
  const sandbox = await sandboxInferenceGet({
    writePolicy: { mode: "read-only" }
  });
  const result = await providerGenerate({
    providerId,
    command,
    prompt: "Reply with <output>ok</output> only.",
    sandbox,
    writePolicy: { mode: "read-only" }
  });
  console.log(result);
  if (!result.output) {
    const stderr = result.failure?.stderr ?? "";
    assertNoProviderFlagParseError(providerId, stderr);
    expect(stderr.length).toBeGreaterThan(0);
    return;
  }

  expect(result.output.trim().length).toBeGreaterThan(0);
}

async function runSingleFileAllowed(providerId: ProviderId, command: string): Promise<void> {
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
      providerId,
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
    console.log(result);
    if (result.failure) {
      assertNoProviderFlagParseError(providerId, result.failure.stderr);
      expect(result.failure.stderr.length).toBeGreaterThan(0);
      return;
    }

    const written = await readFile(outputFile, "utf-8");
    expect(written).toContain("hello-from-provider");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

// describe("providerGenerate claude integration", () => {
//   it(
//     "runs in read-only sandbox without mock command execution",
//     async () => {
//       expect(commandExists("claude")).toBe(true);
//       await runReadOnly("claude", "claude");
//     },
//     TEST_TIMEOUT_MS
//   );

//   it(
//     "runs in single-file write-whitelist sandbox without mock command execution",
//     async () => {
//       expect(commandExists("claude")).toBe(true);
//       await runSingleFileAllowed("claude", "claude");
//     },
//     TEST_TIMEOUT_MS
//   );
// });

describe("providerGenerate codex integration", () => {
  it(
    "runs with read-only permission input without mock command execution",
    async () => {
      expect(commandExists("codex")).toBe(true);
      await runReadOnly("codex", "codex");
    },
    TEST_TIMEOUT_MS
  );

  it(
    "runs with single-file write-whitelist input without mock command execution",
    async () => {
      expect(commandExists("codex")).toBe(true);
      await runSingleFileAllowed("codex", "codex");
    },
    TEST_TIMEOUT_MS
  );
});
