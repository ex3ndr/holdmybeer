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
          modelPriority: input.modelPriority,
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

    // Real provider can fail when auth/network is missing; ensure failures
    // are not caused by unsupported CLI flags.
    expect(message).not.toContain("unknown option '--mode'");
    expect(message).not.toContain("unknown option '--print'");
  }
}

describe("generate pi integration", () => {
  it(
    "runs real pi inference without json-mode flag parsing errors",
    async () => {
      expect(commandExists("pi")).toBe(true);
      await runRealProviderInference("pi", "pi");
    },
    TEST_TIMEOUT_MS
  );
});
