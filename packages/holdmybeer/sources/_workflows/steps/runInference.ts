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
    const eventName = runInferenceEventTokenResolve(normalized, "event");
    if (eventName) {
      return `${providerPrefix}${runInferenceProviderEventHumanize(eventName, normalized)}`;
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

function runInferenceProviderEventHumanize(eventName: string, rawEvent: string): string {
  const role = runInferenceEventTokenResolve(rawEvent, "role");
  const messageType = runInferenceEventTokenResolve(rawEvent, "message");
  const contentType = runInferenceEventTokenResolve(rawEvent, "content");
  const deltaType = runInferenceEventTokenResolve(rawEvent, "delta");
  const stopReason = runInferenceEventTokenResolve(rawEvent, "stop");

  switch (eventName) {
    case "turn_start":
      return "turn started";
    case "turn_end":
      return "turn completed";
    case "message_start":
      return role ? `${role} message started` : "message started";
    case "message_end":
      return role ? `${role} message completed` : "message completed";
    case "message_delta":
      return role ? `${role} message updated` : "message updated";
    case "content_block_start":
      return `${runInferenceContentTypeHumanize(contentType)} started`;
    case "content_block_delta":
      return runInferenceDeltaTypeHumanize(deltaType);
    case "content_block_end":
      return `${runInferenceContentTypeHumanize(contentType)} completed`;
    case "session":
      return "session started";
    case "response_completed":
      return stopReason ? `response completed (${stopReason})` : "response completed";
    default:
      const parts = [eventName.replace(/_/g, " ").trim()];
      if (role) {
        parts.push(role);
      }
      if (messageType) {
        parts.push(messageType);
      }
      return parts.join(" ");
  }
}

function runInferenceEventTokenResolve(event: string, key: string): string | undefined {
  const match = event.match(new RegExp(`(?:^|\\s)${key}=([^\\s]+)`));
  return match?.[1];
}

function runInferenceContentTypeHumanize(contentType: string | undefined): string {
  switch (contentType) {
    case "tool_use":
      return "tool call";
    case "tool_result":
      return "tool result";
    case "text":
      return "text";
    default:
      return "content";
  }
}

function runInferenceDeltaTypeHumanize(deltaType: string | undefined): string {
  switch (deltaType) {
    case "text_delta":
      return "text streaming";
    case "input_json_delta":
      return "tool input streaming";
    case "thinking_delta":
      return "reasoning updated";
    default:
      return "content updated";
  }
}
