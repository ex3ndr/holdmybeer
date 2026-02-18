import type { GenerateTextResult } from "@/modules/ai/generateText.js";
import type { ProviderDetection, ProviderId } from "@/modules/providers/providerTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";

export interface ContextInferTextInput {
  providerPriority: readonly ProviderId[];
  prompt: string;
  showProgress?: boolean;
  writePolicy?: InferenceWritePolicy;
}

export interface Context {
  projectPath: string;
  providers: ProviderDetection[];
  inferText(input: ContextInferTextInput): Promise<GenerateTextResult>;
  stageAndCommit(message: string): Promise<boolean>;
}

declare global {
  var Context: Context | undefined;
}
