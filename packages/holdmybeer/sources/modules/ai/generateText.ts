import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";
import type { ProviderDetection, ProviderId } from "@/modules/providers/providerTypes.js";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import { commandRun } from "@/modules/util/commandRun.js";
import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";

export interface GenerateTextResult {
  provider?: string;
  text: string;
}

export interface GenerateTextOptions {
  onMessage?: (message: string) => void;
  sandbox: CommandSandbox;
  writePolicy?: InferenceWritePolicy;
}

interface ProviderFailure {
  providerId: ProviderId;
  exitCode: number;
  stderr: string;
}

const OUTPUT_RETRY_PROMPT = "Last time you didnt return <output> - do this now";

function inferMessage(message: string, options?: GenerateTextOptions): void {
  options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferOutputMessage(
  providerId: ProviderId,
  stream: "stdout" | "stderr",
  chunk: string,
  options?: GenerateTextOptions
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

function inferPromptResolve(prompt: string, writePolicy: InferenceWritePolicy): string {
  const promptWithOutputTags = [
    prompt,
    "Return the final answer inside <output> and </output> tags only."
  ].join("\n\n");

  if (writePolicy.mode === "read-only") {
    return [
      "Read-only mode is enabled. Do not change files, run write operations, or apply edits.",
      "Use read-only analysis only and return text output.",
      promptWithOutputTags
    ].join("\n\n");
  }

  const writablePaths = writePolicy.writablePaths
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const writableLine =
    writablePaths.length > 0
      ? `Only the following paths are writable: ${writablePaths.join(", ")}.`
      : "No writable paths were configured. Treat this as read-only.";

  return [
    "Write-whitelist mode is enabled.",
    writableLine,
    promptWithOutputTags
  ].join("\n\n");
}

/**
 * Runs a single provider CLI and returns stdout, or null on failure.
 */
async function providerGenerate(
  providerId: ProviderId,
  command: string,
  prompt: string,
  options: GenerateTextOptions
): Promise<{ output: string | null; failure?: ProviderFailure }> {
  inferMessage(`provider=${providerId} started`, options);
  const prompts = [
    prompt,
    [prompt, OUTPUT_RETRY_PROMPT].join("\n\n")
  ];

  for (let attempt = 0; attempt < prompts.length; attempt += 1) {
    const args = providerArgs(providerId, prompts[attempt]!);
    const result = await commandRun(command, args, {
      allowFailure: true,
      timeoutMs: 90_000,
      sandbox: options.sandbox,
      onStdoutText: (chunk) => inferOutputMessage(providerId, "stdout", chunk, options),
      onStderrText: (chunk) => inferOutputMessage(providerId, "stderr", chunk, options)
    });
    const outputRaw = result.stdout.trim();

    if (result.exitCode === 0 && outputRaw) {
      const extracted = aiOutputExtract(outputRaw);
      if (extracted) {
        inferMessage(`provider=${providerId} succeeded`, options);
        return { output: extracted };
      }

      if (attempt === 0) {
        inferMessage(`provider=${providerId} missing <output>, retrying`, options);
        continue;
      }

      inferMessage(`provider=${providerId} missing <output> after retry`, options);
      return {
        output: null,
        failure: {
          providerId,
          exitCode: 1,
          stderr: "Provider did not return <output> tags."
        }
      };
    }

    inferMessage(`provider=${providerId} exit=${result.exitCode}`, options);
    return {
      output: null,
      failure: {
        providerId,
        exitCode: result.exitCode,
        stderr: result.stderr.trim()
      }
    };
  }

  // Unreachable: attempts are bounded, but keep explicit failure as safeguard.
  return {
    output: null,
    failure: {
      providerId,
      exitCode: 1,
      stderr: "Provider execution failed."
    }
  };
}

/**
 * Builds CLI args for a provider invocation.
 */
function providerArgs(providerId: ProviderId, prompt: string): string[] {
  if (providerId === "claude") {
    return ["--dangerously-skip-permissions", "-p", prompt];
  }

  if (providerId === "codex") {
    return ["--dangerously-bypass-approvals-and-sandbox", "-p", prompt];
  }

  return ["--dangerously-skip-permissions", "-p", prompt];
}

/**
 * Tries provider CLIs in order and returns the first generated text.
 */
export async function generateText(
  providers: readonly ProviderDetection[],
  providerPriority: readonly ProviderId[],
  prompt: string,
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const writePolicy: InferenceWritePolicy = options.writePolicy ?? { mode: "read-only" };
  const promptResolved = inferPromptResolve(prompt, writePolicy);
  const prioritizedProviders = providerPriorityList(providers, providerPriority);
  const failures: ProviderFailure[] = [];

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    inferMessage(`provider=${provider.id} selected`, options);
    const result = await providerGenerate(provider.id, provider.command, promptResolved, options);

    if (result.output) {
      inferMessage(`provider=${provider.id} completed`, options);
      return {
        provider: provider.id,
        text: result.output
      };
    }
    if (result.failure) {
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
