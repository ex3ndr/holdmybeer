import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";
import type { ProviderId } from "@/types";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import { commandRun } from "@/modules/util/commandRun.js";

export interface ProviderGenerateInput {
  providerId: ProviderId;
  command: string;
  prompt: string;
  sandbox: CommandSandbox;
  writePolicy?: InferenceWritePolicy;
  requireOutputTags?: boolean;
  onStdoutText?: (chunk: string) => void;
  onStderrText?: (chunk: string) => void;
}

export interface ProviderGenerateFailure {
  providerId: ProviderId;
  exitCode: number;
  stderr: string;
}

export interface ProviderGenerateResult {
  output: string | null;
  failure?: ProviderGenerateFailure;
}

const OUTPUT_RETRY_PROMPT = "Last time you didnt return <output> - do this now";

/**
 * Runs provider inference through CLI and extracts response wrapped in <output> tags.
 * Expects: providerId is either claude or codex and command is executable.
 */
export async function providerGenerate(
  input: ProviderGenerateInput
): Promise<ProviderGenerateResult> {
  const requireOutputTags = input.requireOutputTags ?? true;
  const prompts = [
    input.prompt,
    [input.prompt, OUTPUT_RETRY_PROMPT].join("\n\n")
  ];

  for (let attempt = 0; attempt < prompts.length; attempt += 1) {
    const result = await commandRun(input.command, providerArgs(input.providerId, prompts[attempt]!, input.writePolicy), {
      allowFailure: true,
      timeoutMs: 90_000,
      sandbox: providerSandboxResolve(input),
      env: providerEnv(input.providerId),
      onStdoutText: input.onStdoutText,
      onStderrText: input.onStderrText
    });

    if (result.exitCode !== 0) {
      return {
        output: null,
        failure: {
          providerId: input.providerId,
          exitCode: result.exitCode,
          stderr: result.stderr.trim()
        }
      };
    }

    const outputRaw = result.stdout.trim();
    if (requireOutputTags && !outputRaw) {
      return {
        output: null,
        failure: {
          providerId: input.providerId,
          exitCode: 1,
          stderr: "Provider returned empty stdout."
        }
      };
    }

    if (!requireOutputTags) {
      return { output: outputRaw };
    }

    const extractedOutput = aiOutputExtract(outputRaw);
    if (extractedOutput) {
      return { output: extractedOutput };
    }

    if (attempt === prompts.length - 1) {
      return {
        output: null,
        failure: {
          providerId: input.providerId,
          exitCode: 1,
          stderr: "Provider did not return <output> tags."
        }
      };
    }
  }

  return {
    output: null,
    failure: {
      providerId: input.providerId,
      exitCode: 1,
      stderr: "Provider execution failed."
    }
  };
}

function providerArgs(
  providerId: ProviderId,
  prompt: string,
  writePolicy: InferenceWritePolicy | undefined
): string[] {
  if (providerId === "claude") {
    return ["--dangerously-skip-permissions", "-p", prompt];
  }

  // Codex runs with codex-native approvals+sandbox bypass flag.
  return [...codexArgs(prompt, writePolicy)];
}

function providerEnv(providerId: ProviderId): Record<string, string> | undefined {
  if (providerId !== "codex") {
    return undefined;
  }

  // Codex needs seatbelt mode in sandbox to avoid SCDynamicStore panics.
  return {
    CODEX_SANDBOX: "seatbelt",
    RUST_LOG: "codex_core::rollout::list=off"
  };
}

function providerSandboxResolve(input: ProviderGenerateInput): CommandSandbox | undefined {
  if (input.providerId === "codex") {
    // Codex runs without outer wrapper sandbox.
    return undefined;
  }

  return input.sandbox;
}

function codexArgs(prompt: string, writePolicy: InferenceWritePolicy | undefined): string[] {
  void writePolicy;
  return ["exec", "--dangerously-bypass-approvals-and-sandbox", "--", prompt];
}
