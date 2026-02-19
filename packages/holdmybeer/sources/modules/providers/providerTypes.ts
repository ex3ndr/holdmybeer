export type ProviderId = "pi";
export type ProviderModelSelectionMode = "sonnet" | "opus" | "codex-high" | "codex-xhigh";

export interface ProviderModel {
    id: string;
    provider: string;
    modelId: string;
    name?: string;
    reasoning?: boolean;
    contextWindow?: number;
    maxTokens?: number;
    input?: readonly string[];
}

export interface ProviderDetection {
    id: ProviderId;
    available: boolean;
    command?: string;
    version?: string;
    priority: number;
    models?: readonly ProviderModel[];
}
