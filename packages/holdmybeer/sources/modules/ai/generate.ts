import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";
import type { ProviderId } from "@/types";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";
import {
  providerGenerate,
  type ProviderGenerateFailure
} from "@/modules/ai/providerGenerate.js";
import type { Context } from "@/types";

export interface GenerateResult {
  provider?: string;
  text: string;
}

export type GenerateExpectedOutput =
  | { type: "text" }
  | { type: "file"; filePath: string };

export interface GeneratePermissions {
  providerPriority?: readonly ProviderId[];
  showProgress?: boolean;
  writePolicy?: InferenceWritePolicy;
  enableWeakerNetworkIsolation?: boolean;
  expectedOutput?: GenerateExpectedOutput;
}

interface GenerateOptions {
  onMessage?: (message: string) => void;
}

function inferMessage(message: string, options?: GenerateOptions): void {
  options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferOutputMessage(
  providerId: ProviderId,
  stream: "stdout" | "stderr",
  chunk: string,
  options?: GenerateOptions
): void {
  if (!options?.onMessage) {
    return;
  }

  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    options.onMessage(`[beer][infer] ${providerId}:${stream} ${line}`);
  }
}

function inferPromptResolve(
  prompt: string,
  writePolicy: InferenceWritePolicy,
  expectedOutput: GenerateExpectedOutput
): string {
  return [
    inferSandboxPrompt(writePolicy),
    prompt,
    inferExpectedOutputPrompt(expectedOutput)
  ].join("\n\n");
}

function inferSandboxPrompt(writePolicy: InferenceWritePolicy): string {
  if (writePolicy.mode === "read-only") {
    return [
      "Current sandbox parameters:",
      "- filesystem mode: read-only",
      "- writable paths: none",
      "- network: unrestricted",
      "- do not change files, run write operations, or apply edits"
    ].join("\n");
  }

  const writablePaths = writePolicy.writablePaths
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const writableLine = writablePaths.length > 0
    ? `- writable paths: ${writablePaths.join(", ")}`
    : "- writable paths: none";

  return [
    "Current sandbox parameters:",
    "- filesystem mode: write-whitelist",
    writableLine,
    "- network: unrestricted",
    "- do not write outside writable paths"
  ].join("\n");
}

function inferExpectedOutputPrompt(expectedOutput: GenerateExpectedOutput): string {
  if (expectedOutput.type === "file") {
    return [
      "Expected output:",
      `- create or update this file: ${expectedOutput.filePath}`,
      "- do not write to any other files",
      "- output tags are not required for this file-generation mode",
      "- optional: return a short plain-text confirmation"
    ].join("\n");
  }

  return [
    "Expected output:",
    "- return text only",
    "- return the final answer inside <output> and </output> tags only"
  ].join("\n");
}

/**
 * Runs inference through available providers.
 * Expects: prompt is plain task text; permissions define sandbox policy and expected output.
 */
export async function generate(
  context: Context,
  prompt: string,
  permissions: GeneratePermissions = {}
): Promise<GenerateResult> {
  const writePolicy: InferenceWritePolicy = permissions.writePolicy ?? { mode: "read-only" };
  const expectedOutput: GenerateExpectedOutput = permissions.expectedOutput ?? { type: "text" };
  const onMessage = permissions.showProgress
    ? (message: string) => { console.log(message); }
    : undefined;
  const options: GenerateOptions = { onMessage };
  const sandbox = await sandboxInferenceGet({
    writePolicy,
    enableWeakerNetworkIsolation: permissions.enableWeakerNetworkIsolation
  });

  const promptResolved = inferPromptResolve(prompt, writePolicy, expectedOutput);
  const providerPriority = permissions.providerPriority ?? ["claude", "codex"];
  const prioritizedProviders = providerPriorityList(context.providers, providerPriority);
  const failures: ProviderGenerateFailure[] = [];

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    inferMessage(`provider=${provider.id} selected`, options);
    inferMessage(`provider=${provider.id} started`, options);
    const result = await providerGenerate({
      providerId: provider.id,
      command: provider.command,
      prompt: promptResolved,
      sandbox,
      writePolicy,
      requireOutputTags: expectedOutput.type === "text",
      onStdoutText: (chunk) => inferOutputMessage(provider.id, "stdout", chunk, options),
      onStderrText: (chunk) => inferOutputMessage(provider.id, "stderr", chunk, options)
    });

    if (result.output) {
      inferMessage(`provider=${provider.id} completed`, options);
      return {
        provider: provider.id,
        text: result.output
      };
    }

    if (result.failure) {
      inferMessage(`provider=${provider.id} exit=${result.failure.exitCode}`, options);
      failures.push(result.failure);
    }
  }

  inferMessage("all providers failed", options);
  const details = failures
    .map((entry) => {
      const suffix = entry.stderr ? `, stderr=${entry.stderr}` : "";
      return `${entry.providerId}(exit=${entry.exitCode}${suffix})`;
    })
    .join("; ");
  throw new Error(`Inference failed for all providers${details ? `: ${details}` : "."}`);
}
