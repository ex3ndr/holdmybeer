import {
  generate,
  type GeneratePermissions,
  type GenerateResult
} from "@/modules/ai/generate.js";
import { contextGet } from "@/modules/context/contextGet.js";
import { stepProgressStart } from "@/_workflows/steps/stepProgressStart.js";
import { text } from "@text";

export interface RunInferenceOptions extends GeneratePermissions {
  progressMessage: string;
}

/**
 * Runs inference with already initialized global context.
 * Expects: promptTemplate may include {{key}} placeholders from values and progressMessage is non-empty.
 */
export async function runInference(
  promptTemplate: string,
  values: Record<string, string | number> = {},
  options: RunInferenceOptions
): Promise<GenerateResult> {
  const progressMessage = options.progressMessage.trim();
  if (!progressMessage) {
    throw new Error(text["error_inference_progress_message_required"]!);
  }

  const { progressMessage: _progressMessage, ...permissionsBase } = options;
  const context = contextGet();
  const prompt = runInferencePromptResolve(promptTemplate, values);
  const progress = permissionsBase.showProgress ? stepProgressStart(progressMessage) : null;
  const permissions: GeneratePermissions = {
    ...permissionsBase,
    onEvent: (event: string) => {
      permissionsBase.onEvent?.(event);
      progress?.update(`${progressMessage} (${event})`);
    }
  };

  try {
    const result = await generate(context, prompt, permissions);
    progress?.done();
    return result;
  } catch (error) {
    progress?.fail();
    throw error;
  }
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
