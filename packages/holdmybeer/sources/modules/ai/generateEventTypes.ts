import type { ProviderEvent, ProviderTokenUsage } from "@/modules/ai/providerEventTypes.js";
import type { ProviderId } from "@/modules/providers/providerTypes.js";

export interface GenerateProviderFailure {
    providerId: ProviderId;
    exitCode: number;
    stderr: string;
}

export type GenerateEvent =
    | {
          type: "provider_status";
          providerId: ProviderId;
          status: "selected" | "started" | "completed" | "failed";
          model?: string;
          sessionId?: string;
          exitCode?: number;
          tokens?: ProviderTokenUsage;
      }
    | {
          type: "provider_stderr";
          providerId: ProviderId;
          text: string;
      }
    | ({ providerId: ProviderId } & ProviderEvent)
    | {
          type: "all_providers_failed";
          failures: readonly GenerateProviderFailure[];
      };
