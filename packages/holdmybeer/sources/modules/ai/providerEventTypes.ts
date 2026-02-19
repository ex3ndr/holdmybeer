export type ProviderEvent =
    | { type: "session_started"; sessionId: string }
    | { type: "thinking_start" }
    | { type: "thinking_delta"; delta: string }
    | { type: "thinking_stop" }
    | { type: "tool_call_start"; toolName?: string }
    | { type: "tool_call_stop"; toolName?: string }
    | { type: "text_start" }
    | { type: "text_delta"; delta: string }
    | { type: "text_stop" };
