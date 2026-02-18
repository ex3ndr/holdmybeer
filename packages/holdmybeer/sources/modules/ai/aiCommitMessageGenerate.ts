import type { Context } from "@/types";

export interface AiCommitMessageGenerateOptions {
  showProgress?: boolean;
}

/**
 * Generates an Angular-style initial commit message.
 */
export async function aiCommitMessageGenerate(
  context: Context,
  sourceFullName: string,
  options: AiCommitMessageGenerateOptions = {}
): Promise<{ provider?: string; text: string }> {
  const prompt = [
    "Generate one Angular-style git commit message for initial bootstrap.",
    "Return a single line only.",
    `Context: bootstrap project for source repository ${sourceFullName}.`
  ].join("\n");

  const result = await context.inferText({
    providerPriority: ["claude", "codex"],
    prompt,
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
