import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Context } from "@/types";
import { textFormat } from "@text";
import { generate } from "@/modules/ai/generate.js";

export interface AiReadmeGenerateInput {
  sourceFullName: string;
  publishFullName: string;
  originalCheckoutPath: string;
}

export interface AiReadmeGenerateOptions {
  showProgress?: boolean;
}

const promptTemplate = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../prompts/PROMPT_README.md"),
  "utf-8"
);
const README_MODEL_PRIORITY = [
  "openai-codex/gpt-5.3-codex",
  "openai-codex/gpt-5.2-codex",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-3-7-sonnet-latest"
] as const;

/**
 * Generates initial README markdown using provider priority.
 * Reads the prompt template from PROMPT_README.md and substitutes input values.
 */
export async function aiReadmeGenerate(
  context: Context,
  input: AiReadmeGenerateInput,
  options: AiReadmeGenerateOptions = {}
): Promise<{ provider?: string; text: string }> {
  const prompt = textFormat(promptTemplate, {
    sourceFullName: input.sourceFullName,
    publishFullName: input.publishFullName,
    originalCheckoutPath: input.originalCheckoutPath
  });

  return generate(context, prompt, {
    showProgress: options.showProgress,
    modelPriority: README_MODEL_PRIORITY,
    writePolicy: { mode: "read-only" }
  });
}
