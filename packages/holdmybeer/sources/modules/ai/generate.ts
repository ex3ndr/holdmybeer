import { beerLogLine } from "@text";
import { type ProviderGenerateFailure, providerGenerate } from "@/modules/ai/providerGenerate.js";
import { providerModelSelect } from "@/modules/providers/providerModelSelect.js";
import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import type { Context, ProviderId, ProviderModelSelectionMode } from "@/types";

export interface GenerateResult {
  provider?: string;
  text: string;
}

export type GenerateExpectedOutput = { type: "text" } | { type: "file"; filePath: string };

export interface GeneratePermissions {
  providerPriority?: readonly ProviderId[];
  modelPriority?: readonly string[];
  modelSelectionMode?: ProviderModelSelectionMode;
  showProgress?: boolean;
  onEvent?: (event: string) => void;
  writePolicy?: InferenceWritePolicy;
  enableWeakerNetworkIsolation?: boolean;
  expectedOutput?: GenerateExpectedOutput;
}

interface GenerateOptions {
  onMessage?: (message: string) => void;
  onEvent?: (event: string) => void;
}

function inferMessage(message: string, options?: GenerateOptions): void {
  options?.onMessage?.(`[beer][infer] ${message}`);
  options?.onEvent?.(message);
}

function inferOutputMessage(
  providerId: ProviderId,
  stream: "stdout" | "stderr",
  chunk: string,
  options?: GenerateOptions
): void {
  if (!options?.onMessage && !options?.onEvent) {
    return;
  }

  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    options.onMessage?.(`[beer][infer] ${providerId}:${stream} ${line}`);
    options.onEvent?.(
      stream === "stderr" ? `provider=${providerId} stderr` : `provider=${providerId} ${inferOutputEventResolve(line)}`
    );
  }
}

/** Parses a PI native JSON event line into a compact key=value event string. */
function inferOutputEventResolve(line: string): string {
  try {
    const parsed = JSON.parse(line) as {
      type?: unknown;
      contentIndex?: unknown;
      toolCall?: { name?: unknown };
      partial?: { content?: unknown[] };
      reason?: unknown;
    };
    const eventType = inferOutputEventTokenResolve(parsed.type);
    if (!eventType) {
      return "stdout";
    }
    const parts = [`event=${eventType}`];
    const toolName = inferOutputToolNameResolve(parsed, eventType);
    if (toolName) {
      parts.push(`tool=${toolName}`);
    }
    const reason = inferOutputEventTokenResolve(parsed.reason);
    if (reason) {
      parts.push(`reason=${reason}`);
    }
    return parts.join(" ");
  } catch {
    // Ignore parse errors and keep compact generic event for loader updates.
  }
  return "stdout";
}

/** Extracts tool name from PI toolcall events. */
function inferOutputToolNameResolve(
  parsed: { type?: unknown; contentIndex?: unknown; toolCall?: { name?: unknown }; partial?: { content?: unknown[] } },
  eventType: string
): string | undefined {
  if (eventType === "toolcall_end") {
    return inferOutputEventTokenResolve(parsed.toolCall?.name);
  }
  if (eventType === "toolcall_start" || eventType === "toolcall_delta") {
    const content = parsed.partial?.content;
    if (!Array.isArray(content)) {
      return undefined;
    }
    const idx = typeof parsed.contentIndex === "number" ? parsed.contentIndex : content.length - 1;
    const entry = content[idx] as { name?: unknown } | undefined;
    return inferOutputEventTokenResolve(entry?.name);
  }
  return undefined;
}

function inferOutputEventTokenResolve(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function inferPromptResolve(
  prompt: string,
  writePolicy: InferenceWritePolicy,
  expectedOutput: GenerateExpectedOutput
): string {
  return [inferSandboxPrompt(writePolicy), prompt, inferExpectedOutputPrompt(expectedOutput)].join("\n\n");
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

  const writablePaths = writePolicy.writablePaths.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  const writableLine =
    writablePaths.length > 0 ? `- writable paths: ${writablePaths.join(", ")}` : "- writable paths: none";

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
    ? (message: string) => {
        beerLogLine(message);
      }
    : undefined;
  const options: GenerateOptions = {
    onMessage,
    onEvent: permissions.onEvent
  };
  const sandbox = await sandboxInferenceGet({
    writePolicy,
    enableWeakerNetworkIsolation: permissions.enableWeakerNetworkIsolation
  });

  const promptResolved = inferPromptResolve(prompt, writePolicy, expectedOutput);
  const providerPriority = permissions.providerPriority ?? ["pi"];
  const prioritizedProviders = providerPriorityList(context.providers, providerPriority);
  const failures: ProviderGenerateFailure[] = [];

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    inferMessage(`provider=${provider.id} selected`, options);
    inferMessage(`provider=${provider.id} started`, options);
    const model = providerModelSelect({
      provider,
      modelPriority: permissions.modelPriority,
      mode: permissions.modelSelectionMode
    });
    if (model) {
      inferMessage(`provider=${provider.id} model=${model}`, options);
    }
    const result = await providerGenerate({
      providerId: provider.id,
      command: provider.command,
      model,
      prompt: promptResolved,
      sandbox,
      writePolicy,
      requireOutputTags: expectedOutput.type === "text",
      onStdoutText: (chunk) => inferOutputMessage(provider.id, "stdout", chunk, options),
      onStderrText: (chunk) => inferOutputMessage(provider.id, "stderr", chunk, options)
    });

    if (result.output !== null) {
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
