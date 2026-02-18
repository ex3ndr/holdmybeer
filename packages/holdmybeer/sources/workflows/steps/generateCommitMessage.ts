import type { Context } from "@/types";
import { generate } from "@/modules/ai/generate.js";

export interface GenerateCommitMessageOptions {
  showProgress?: boolean;
}

const COMMIT_MODEL_PRIORITY = [
  "openai-codex/gpt-5.1-codex-mini",
  "openai-codex/gpt-5.3-codex",
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-sonnet-4-6"
] as const;

/**
 * Generates an Angular-style initial commit message for bootstrap workflow.
 * Expects: sourceFullName is a valid owner/repo string.
 */
export async function generateCommitMessage(
  context: Context,
  sourceFullName: string,
  options: GenerateCommitMessageOptions = {}
): Promise<{ provider?: string; text: string }> {
  const prompt = [
    "Generate one Angular-style git commit message for initial bootstrap.",
    "Return a single line only.",
    `Context: bootstrap project for source repository ${sourceFullName}.`
  ].join("\n");

  const result = await generate(context, prompt, {
    showProgress: options.showProgress,
    modelPriority: COMMIT_MODEL_PRIORITY
  });
  const firstLine = result.text.split("\n")[0]?.trim();
  if (!firstLine) {
    throw new Error("Inference returned empty commit message.");
  }

  return {
    provider: result.provider,
    text: firstLine
  };
}
