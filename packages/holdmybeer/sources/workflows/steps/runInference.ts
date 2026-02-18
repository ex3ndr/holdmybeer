import {
  generate,
  type GeneratePermissions,
  type GenerateResult
} from "@/modules/ai/generate.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";

/**
 * Runs inference with global context for the current project directory.
 * Expects: promptTemplate may include {{key}} placeholders from values.
 */
export async function runInference(
  promptTemplate: string,
  values: Record<string, string | number> = {},
  permissions: GeneratePermissions = {}
): Promise<GenerateResult> {
  const context = await contextGetOrInitialize(process.cwd());
  const prompt = runInferencePromptResolve(promptTemplate, values);
  return generate(context, prompt, permissions);
}

function runInferencePromptResolve(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match: string, key: string) => {
    if (values[key] === undefined) {
      return match;
    }
    return String(values[key]);
  });
}
