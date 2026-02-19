import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";
import type { ProviderId } from "@/types";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import { commandRun } from "@/modules/util/commandRun.js";

export interface ProviderGenerateInput {
  providerId: ProviderId;
  command: string;
  model?: string;
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
 * Expects: providerId is pi and command is executable.
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
    const result = await commandRun(input.command, providerArgs(input.providerId, prompts[attempt]!, input.model), {
      allowFailure: true,
      timeoutMs: null,
      sandbox: providerSandboxResolve(input),
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

    const outputRaw = providerOutputResolve(input.providerId, result.stdout);
    if (!outputRaw) {
      if (!requireOutputTags) {
        // File-generation mode allows empty assistant text.
        return { output: "" };
      }

      return {
        output: null,
        failure: {
          providerId: input.providerId,
          exitCode: 1,
          stderr: "Provider returned no JSON assistant output."
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
  model: string | undefined
): string[] {
  const args = ["--mode", "json", "--print", "--no-session"];
  if (model && model.trim().length > 0) {
    args.push("--model", model.trim());
  }
  args.push(prompt);
  return args;
}

function providerSandboxResolve(input: ProviderGenerateInput): CommandSandbox | undefined {
  return input.sandbox;
}

function providerOutputResolve(providerId: ProviderId, stdout: string): string | null {
  if (providerId !== "pi") {
    return stdout.trim() || null;
  }
  return providerOutputResolvePiJson(stdout);
}

function providerOutputResolvePiJson(stdout: string): string | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let finalAssistantText: string | undefined;
  for (const line of lines) {
    const parsed = providerPiEventParse(line);
    if (!parsed || typeof parsed !== "object") {
      continue;
    }

    const text = providerPiAssistantText(parsed);
    if (typeof text === "string") {
      finalAssistantText = text;
    }
  }

  const output = finalAssistantText?.trim();
  return output && output.length > 0 ? output : null;
}

function providerPiEventParse(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function providerPiAssistantText(event: unknown): string | undefined {
  if (!event || typeof event !== "object") {
    return undefined;
  }

  const typed = event as {
    type?: string;
    message?: { role?: string; content?: unknown };
  };
  if (typed.type !== "message_end" || typed.message?.role !== "assistant") {
    return undefined;
  }

  return providerPiContentText(typed.message.content);
}

function providerPiContentText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const typed = entry as { type?: string; text?: string };
      return typed.type === "text" && typeof typed.text === "string"
        ? typed.text
        : "";
    })
    .join("");
}
