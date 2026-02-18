export type ProviderId = "claude" | "codex";

export interface ProviderDetection {
  id: ProviderId;
  available: boolean;
  command?: string;
  version?: string;
  priority: number;
}
