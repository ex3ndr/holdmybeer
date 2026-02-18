export type ProviderId = "pi";

export interface ProviderModel {
  id: string;
  provider: string;
  modelId: string;
}

export interface ProviderDetection {
  id: ProviderId;
  available: boolean;
  command?: string;
  version?: string;
  priority: number;
  models?: readonly ProviderModel[];
}
