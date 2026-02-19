export interface ProviderTokenUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
}

export type ProviderStreamStatus = "started" | "updated" | "stopped";

export type ProviderEvent =
    | { type: "session_started"; sessionId: string }
    | { type: "thinking"; status: ProviderStreamStatus; text: string; tokens?: ProviderTokenUsage }
    | {
          type: "tool_call";
          status: ProviderStreamStatus;
          toolName?: string;
          toolCallId?: string;
          arguments?: unknown;
          partialJson?: string;
          tokens?: ProviderTokenUsage;
      }
    | { type: "text"; status: ProviderStreamStatus; text: string; tokens?: ProviderTokenUsage }
    | { type: "usage"; tokens: ProviderTokenUsage };
