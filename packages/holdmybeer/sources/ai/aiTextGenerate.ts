import { providerPriorityList } from "../providers/providerPriorityList.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";
import { commandRun } from "../util/commandRun.js";

export interface AiTextGenerateResult {
  provider?: string;
  text: string;
}

async function providerGenerateClaude(command: string, prompt: string): Promise<string | null> {
  const attempts: string[][] = [
    ["-p", prompt],
    ["--print", prompt],
    ["print", prompt]
  ];

  for (const args of attempts) {
    const result = await commandRun(command, args, {
      allowFailure: true,
      timeoutMs: 90_000
    });
    const output = result.stdout.trim();
    if (result.exitCode === 0 && output) {
      return output;
    }
  }

  return null;
}

async function providerGenerateCodex(command: string, prompt: string): Promise<string | null> {
  const attempts: string[][] = [
    ["-p", prompt],
    ["ask", prompt]
  ];

  for (const args of attempts) {
    const result = await commandRun(command, args, {
      allowFailure: true,
      timeoutMs: 90_000
    });
    const output = result.stdout.trim();
    if (result.exitCode === 0 && output) {
      return output;
    }
  }

  return null;
}

/**
 * Tries provider CLIs in order and returns the first generated text.
 */
export async function aiTextGenerate(
  providers: readonly ProviderDetection[],
  providerPriority: readonly ProviderId[],
  prompt: string,
  fallbackText: string
): Promise<AiTextGenerateResult> {
  const prioritizedProviders = providerPriorityList(providers, providerPriority);

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    let output: string | null = null;
    if (provider.id === "claude") {
      output = await providerGenerateClaude(provider.command, prompt);
    } else if (provider.id === "codex") {
      output = await providerGenerateCodex(provider.command, prompt);
    }

    if (output) {
      return {
        provider: provider.id,
        text: output
      };
    }
  }

  return { text: fallbackText };
}
