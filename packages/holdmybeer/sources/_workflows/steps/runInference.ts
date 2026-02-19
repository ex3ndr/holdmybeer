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
      if (progress) {
        const updated = runInferenceProgressMessageResolve(progressMessage, event);
        if (updated) {
          progress.update(updated);
        }
      }
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

/**
 * Returns an updated progress string when the event is user-meaningful, or null to keep the
 * current spinner text unchanged. Only content-level events (thinking, writing, tool use)
 * produce visible updates; protocol-level events (turn/message start/end, selected, etc.)
 * are suppressed.
 */
function runInferenceProgressMessageResolve(baseMessage: string, event: string): string | null {
  const label = runInferenceEventHumanize(event);
  if (!label) {
    return null;
  }
  return `${baseMessage} (${label})`;
}

function runInferenceEventHumanize(event: string): string {
  const normalized = event.trim();
  if (!normalized) {
    return "";
  }

  const eventName = runInferenceEventTokenResolve(normalized, "event");
  if (eventName) {
    return runInferenceStreamEventHumanize(eventName, normalized);
  }

  return "";
}

/** Maps SSE stream event types to short user-facing labels. */
function runInferenceStreamEventHumanize(eventName: string, rawEvent: string): string {
  const contentType = runInferenceEventTokenResolve(rawEvent, "content");
  const deltaType = runInferenceEventTokenResolve(rawEvent, "delta");

  switch (eventName) {
    case "content_block_start":
      if (contentType === "tool_use") return "using tools";
      if (contentType === "text") return "writing";
      return "";
    case "content_block_delta":
      if (deltaType === "thinking_delta") return "thinking";
      if (deltaType === "text_delta") return "writing";
      if (deltaType === "input_json_delta") return "using tools";
      return "";
    default:
      return "";
  }
}

function runInferenceEventTokenResolve(event: string, key: string): string | undefined {
  const match = event.match(new RegExp(`(?:^|\\s)${key}=([^\\s]+)`));
  return match?.[1];
}
