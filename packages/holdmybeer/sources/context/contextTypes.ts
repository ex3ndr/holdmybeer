import type { AiTextGenerateResult } from "../ai/aiTextGenerate.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";

export interface ContextInferTextInput {
  providerPriority: readonly ProviderId[];
  prompt: string;
  fallbackText: string;
  showProgress?: boolean;
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
