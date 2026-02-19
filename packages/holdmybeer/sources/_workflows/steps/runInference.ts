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
      progress?.update(runInferenceProgressMessageResolve(progressMessage, event));
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

function runInferenceProgressMessageResolve(baseMessage: string, event: string): string {
  const eventHumanized = runInferenceEventHumanize(event);
  if (!eventHumanized) {
    return baseMessage;
  }
  return `${baseMessage} (${eventHumanized})`;
}

function runInferenceEventHumanize(event: string): string {
  const normalized = event.trim();
  if (!normalized) {
    return "";
  }

  const providerMatch = normalized.match(/(?:^|\s)provider=([^\s]+)/);
  const provider = providerMatch?.[1]?.toUpperCase();
  const providerPrefix = provider ? `${provider} ` : "";

  if (provider && normalized.includes(" event=")) {
    const eventMatch = normalized.match(/(?:^|\s)event=([^\s]+)/);
    if (eventMatch?.[1]) {
      return `${providerPrefix}${runInferenceProviderEventHumanize(eventMatch[1])}`;
    }
  }

  if (provider && normalized.includes(" model=")) {
    const modelMatch = normalized.match(/(?:^|\s)model=([^\s]+)/);
    if (modelMatch?.[1]) {
      return `${providerPrefix}model ${modelMatch[1]}`;
    }
  }

  if (provider && normalized.endsWith(" selected")) {
    return `${providerPrefix}selected`.trim();
  }
  if (provider && normalized.endsWith(" started")) {
    return `${providerPrefix}started`.trim();
  }
  if (provider && normalized.endsWith(" completed")) {
    return `${providerPrefix}completed`.trim();
  }
  if (provider && normalized.endsWith(" stderr")) {
    return `${providerPrefix}stderr output`.trim();
  }

  if (provider && normalized.includes(" exit=")) {
    const exitMatch = normalized.match(/(?:^|\s)exit=([^\s]+)/);
    if (exitMatch?.[1]) {
      return `${providerPrefix}failed (exit ${exitMatch[1]})`;
    }
  }

  if (normalized === "all providers failed") {
    return "all providers failed";
  }

  return normalized
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function runInferenceProviderEventHumanize(eventName: string): string {
  switch (eventName) {
    case "turn_start":
      return "turn started";
    case "turn_end":
      return "turn completed";
    case "message_start":
      return "message started";
    case "message_end":
      return "message completed";
    case "content_block_start":
      return "content started";
    case "content_block_delta":
      return "content updated";
    case "content_block_end":
      return "content completed";
    default:
      return eventName.replace(/_/g, " ").trim();
  }
}
