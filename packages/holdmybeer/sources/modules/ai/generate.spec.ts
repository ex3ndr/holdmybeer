import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { generate } from "@/modules/ai/generate.js";
import type { Context } from "@/types";
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

function contextForProvider(providerId: ProviderId, command: string): Context {
  return {
    projectPath: "/tmp/test-project",
    providers: [{ id: providerId, available: true, command, priority: 1 }],
    inferText: (input) =>
      generate(
        contextForProvider(providerId, command),
        input.prompt,
        {
          providerPriority: input.providerPriority,
          showProgress: input.showProgress,
          writePolicy: input.writePolicy
        }
      ),
    stageAndCommit: async () => false
  };
}

async function runRealProviderInference(providerId: ProviderId, command: string): Promise<void> {
  const context = contextForProvider(providerId, command);

  try {
    const result = await generate(context, "Reply with a short single sentence.", {
      providerPriority: [providerId]
    });

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

describe("generate claude integration", () => {
  it(
    "runs real claude inference without provider-flag parsing errors",
    async () => {
      expect(commandExists("claude")).toBe(true);
      await runRealProviderInference("claude", "claude");
    },
    TEST_TIMEOUT_MS
  );
});

describe("generate codex integration", () => {
  it(
    "runs real codex inference without provider-flag parsing errors",
    async () => {
      expect(commandExists("codex")).toBe(true);
      await runRealProviderInference("codex", "codex");
    },
    TEST_TIMEOUT_MS
  );
});
