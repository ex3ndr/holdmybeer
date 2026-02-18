import type { Context, InferenceWritePolicy, ProviderId } from "@/types";

export interface GeneratePermissions {
  providerPriority?: readonly ProviderId[];
  showProgress?: boolean;
  writePolicy?: InferenceWritePolicy;
}

/**
 * Runs text generation with explicit prompt and inference permissions.
 * Expects: fallbackText is non-empty and prompt is ready for provider execution.
 */
export async function generate(
  context: Context,
  prompt: string,
  fallbackText: string,
  permissions: GeneratePermissions = {}
): Promise<{ provider?: string; text: string }> {
  return context.inferText({
    providerPriority: permissions.providerPriority ?? ["claude", "codex"],
    prompt,
    fallbackText,
    showProgress: permissions.showProgress,
    writePolicy: permissions.writePolicy ?? { mode: "read-only" }
  });
}
