import { providerPriorityList } from "../providers/providerPriorityList.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";
import type { CommandSandbox } from "../sandbox/sandboxTypes.js";
import { commandRun } from "../util/commandRun.js";

export interface AiTextGenerateResult {
  provider?: string;
  text: string;
}

export interface AiTextGenerateOptions {
  onMessage?: (message: string) => void;
  readOnly?: boolean;
  sandbox?: CommandSandbox;
}

interface ProviderAttempt {
  label: string;
  args: string[];
}

function inferMessage(message: string, options?: AiTextGenerateOptions): void {
  options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferOutputMessage(
  providerId: ProviderId,
  stream: "stdout" | "stderr",
  chunk: string,
  options?: AiTextGenerateOptions
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

function inferPromptResolve(prompt: string, readOnly: boolean): string {
  if (!readOnly) {
    return prompt;
  }

  return [
    "Read-only mode is enabled. Do not change files, run write operations, or apply edits.",
    "Use read-only analysis only and return text output.",
    prompt
  ].join("\n\n");
}

async function providerGenerateClaude(
  command: string,
  prompt: string,
  options?: AiTextGenerateOptions
): Promise<string | null> {
  const readOnlyArgs = options?.readOnly ? ["--tools", ""] : [];
  const attempts: ProviderAttempt[] = [
    { label: "-p", args: [...readOnlyArgs, "-p", prompt] },
    { label: "--print", args: [...readOnlyArgs, "--print", prompt] },
    { label: "print", args: [...readOnlyArgs, "print", prompt] }
  ];

  for (const attempt of attempts) {
    inferMessage(`provider=claude attempt=${attempt.label} started`, options);
    const result = await commandRun(command, attempt.args, {
      allowFailure: true,
      timeoutMs: 90_000,
      sandbox: options?.sandbox,
      onStdoutText: (chunk) => inferOutputMessage("claude", "stdout", chunk, options),
      onStderrText: (chunk) => inferOutputMessage("claude", "stderr", chunk, options)
    });
    const output = result.stdout.trim();
    if (result.exitCode === 0 && output) {
      inferMessage(`provider=claude attempt=${attempt.label} succeeded`, options);
      return output;
    }
    inferMessage(`provider=claude attempt=${attempt.label} exit=${result.exitCode}`, options);
  }

  return null;
}

async function providerGenerateCodex(
  command: string,
  prompt: string,
  options?: AiTextGenerateOptions
): Promise<string | null> {
  const readOnlyArgs = options?.readOnly ? ["--sandbox", "read-only"] : [];
  const attempts: ProviderAttempt[] = [
    { label: "-p", args: [...readOnlyArgs, "-p", prompt] },
    { label: "ask", args: [...readOnlyArgs, "ask", prompt] }
  ];

  for (const attempt of attempts) {
    inferMessage(`provider=codex attempt=${attempt.label} started`, options);
    const result = await commandRun(command, attempt.args, {
      allowFailure: true,
      timeoutMs: 90_000,
      sandbox: options?.sandbox,
      onStdoutText: (chunk) => inferOutputMessage("codex", "stdout", chunk, options),
      onStderrText: (chunk) => inferOutputMessage("codex", "stderr", chunk, options)
    });
    const output = result.stdout.trim();
    if (result.exitCode === 0 && output) {
      inferMessage(`provider=codex attempt=${attempt.label} succeeded`, options);
      return output;
    }
    inferMessage(`provider=codex attempt=${attempt.label} exit=${result.exitCode}`, options);
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
  fallbackText: string,
  options?: AiTextGenerateOptions
): Promise<AiTextGenerateResult> {
  const readOnly = options?.readOnly ?? true;
  const promptResolved = inferPromptResolve(prompt, readOnly);
  const prioritizedProviders = providerPriorityList(providers, providerPriority);

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    inferMessage(`provider=${provider.id} selected`, options);
    let output: string | null = null;
    if (provider.id === "claude") {
      output = await providerGenerateClaude(provider.command, promptResolved, {
        ...options,
        readOnly
      });
    } else if (provider.id === "codex") {
      output = await providerGenerateCodex(provider.command, promptResolved, {
        ...options,
        readOnly
      });
    }

    if (output) {
      inferMessage(`provider=${provider.id} completed`, options);
      return {
        provider: provider.id,
        text: output
      };
    }
  }

  inferMessage("all providers failed, using fallback text", options);
  return { text: fallbackText };
}
