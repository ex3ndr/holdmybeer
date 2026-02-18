import type { AiTextGenerateResult } from "../ai/aiTextGenerate.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";
import type { InferenceWritePolicy } from "../sandbox/sandboxInferenceTypes.js";

export interface ContextInferTextInput {
  providerPriority: readonly ProviderId[];
  prompt: string;
  fallbackText: string;
  showProgress?: boolean;
  writePolicy?: InferenceWritePolicy;
}

export interface Context {
  projectPath: string;
  providers: ProviderDetection[];
  inferText(input: ContextInferTextInput): Promise<AiTextGenerateResult>;
  stageAndCommit(message: string): Promise<boolean>;
}

declare global {
  var Context: Context | undefined;
}
