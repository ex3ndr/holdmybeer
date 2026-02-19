import type { GenerateResult } from "@/modules/ai/generate.js";
import type { ProviderDetection, ProviderId, ProviderModelSelectionMode } from "@/modules/providers/providerTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";

export interface ContextInferTextInput {
    providerPriority: readonly ProviderId[];
    modelPriority?: readonly string[];
    modelSelectionMode?: ProviderModelSelectionMode;
    prompt: string;
    showProgress?: boolean;
    writePolicy?: InferenceWritePolicy;
}

export interface Context {
    projectPath: string;
    providers: ProviderDetection[];
    inferText(input: ContextInferTextInput): Promise<GenerateResult>;
    stageAndCommit(message: string): Promise<boolean>;
}

declare global {
    var Context: Context | undefined;
}
