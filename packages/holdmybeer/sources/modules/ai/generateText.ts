import { generate, type GeneratePermissions, type GenerateResult } from "@/modules/ai/generate.js";
import type { Context } from "@/types";

export type GenerateTextPermissions = Omit<GeneratePermissions, "expectedOutput">;

/**
 * Shortcut for text generation with default text expectation.
 * Expects: prompt is inference task text and permissions optionally constrain provider/write policy.
 */
export async function generateText(
  context: Context,
  prompt: string,
  permissions: GenerateTextPermissions = {}
): Promise<GenerateResult> {
  return generate(context, prompt, {
    ...permissions,
    expectedOutput: { type: "text" }
  });
}
