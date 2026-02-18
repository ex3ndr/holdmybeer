import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";
import { generateText } from "@/modules/ai/generateText.js";
import type { ProviderId } from "@/modules/providers/providerTypes.js";

const TEST_TIMEOUT_MS = 180_000;

function commandExists(command: string): boolean {
  const result = spawnSync("zsh", ["-lc", `command -v ${command}`], {
    encoding: "utf-8"
  });
  return result.status === 0;
}

function errorTextResolve(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function runRealProviderInference(providerId: ProviderId, command: string): Promise<void> {
  const sandbox = await sandboxInferenceGet({
    writePolicy: { mode: "read-only" }
  });

  try {
    const result = await generateText(
      [{ id: providerId, available: true, command, priority: 1 }],
      [providerId],
      "Reply with a short single sentence.",
      { sandbox }
    );

    expect(result.provider).toBe(providerId);
    expect(result.text.trim().length).toBeGreaterThan(0);
  } catch (error) {
    const message = errorTextResolve(error);
    const providerFlag = providerId === "claude"
      ? "--dangerously-skip-permissions"
      : "--dangerously-bypass-approvals-and-sandbox";

    // Real providers can fail when auth is missing; this assertion ensures
    // failures are not caused by invalid provider flags.
    expect(message).not.toContain(`unexpected argument '${providerFlag}'`);
    expect(message).not.toContain(`unrecognized option '${providerFlag}'`);
  }
}

describe("generateText claude integration", () => {
  it(
    "runs real claude inference without provider-flag parsing errors",
    async () => {
      expect(commandExists("claude")).toBe(true);
      await runRealProviderInference("claude", "claude");
    },
    TEST_TIMEOUT_MS
  );
});

describe("generateText codex integration", () => {
  it(
    "runs real codex inference without provider-flag parsing errors",
    async () => {
      expect(commandExists("codex")).toBe(true);
      await runRealProviderInference("codex", "codex");
    },
    TEST_TIMEOUT_MS
  );
});
