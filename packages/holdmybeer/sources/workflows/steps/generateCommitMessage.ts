import type { Context } from "@/types";
import { generate } from "@/modules/ai/generate.js";

export interface GenerateCommitMessageOptions {
  showProgress?: boolean;
}

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
    showProgress: options.showProgress
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
