import type { Context } from "@/types";

export interface AiCommitMessageGenerateOptions {
  showProgress?: boolean;
}

/**
 * Generates an Angular-style initial commit message with fallback.
 */
export async function aiCommitMessageGenerate(
  context: Context,
  sourceFullName: string,
  options: AiCommitMessageGenerateOptions = {}
): Promise<{ provider?: string; text: string }> {
  const prompt = [
    "Generate one Angular-style git commit message for initial bootstrap.",
    "Return a single line only.",
    `Context: bootstrap rewrite project for source repository ${sourceFullName}.`
  ].join("\n");

  const result = await context.inferText({
    providerPriority: ["claude", "codex"],
    prompt,
    fallbackText: "feat: bootstrap holdmybeer flow",
    showProgress: options.showProgress
  });
  const firstLine = result.text.split("\n")[0]?.trim() || "feat: bootstrap holdmybeer flow";

  return {
    provider: result.provider,
    text: firstLine
  };
}
