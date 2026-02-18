import type { AiTextGenerateResult } from "../ai/aiTextGenerate.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";

export interface ContextInferTextInput {
  providerPriority: readonly ProviderId[];
  prompt: string;
  fallbackText: string;
}

export interface Context {
  providers: ProviderDetection[];
  inferText(input: ContextInferTextInput): Promise<AiTextGenerateResult>;
}

declare global {
  var Context: Context | undefined;
}
