import { runInference } from "@/_workflows/steps/runInference.js";
import { text } from "@text";

export interface GenerateCommitOptions {
  showProgress?: boolean;
}

const promptTemplate = [
  "Generate one Angular-style git commit message for initial bootstrap.",
  "Return a single line only.",
  "Context: bootstrap project for source repository {{sourceFullName}}."
].join("\n");

/**
 * Generates a single-line Angular-style commit message from global context.
 * Expects: sourceFullName is a valid owner/repo string.
 */
export async function generateCommit(
  sourceFullName: string,
  options: GenerateCommitOptions = {}
): Promise<{ provider?: string; text: string }> {
  const result = await runInference(promptTemplate, { sourceFullName }, {
    progressMessage: text["inference_commit_generating"]!,
    showProgress: options.showProgress,
    modelSelectionMode: "fast"
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
