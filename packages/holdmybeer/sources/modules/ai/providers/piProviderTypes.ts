export interface PiProviderTextContent {
    type: "text";
    text: string;
}

export interface PiProviderThinkingContent {
    type?: unknown;
    thinking?: unknown;
}

export interface PiProviderToolCallContent {
    type?: unknown;
    id?: unknown;
    name?: unknown;
    arguments?: unknown;
    partialJson?: unknown;
}

export interface PiProviderOtherContent {
    type?: string;
    text?: unknown;
}

export type PiProviderContent =
    | PiProviderTextContent
    | PiProviderThinkingContent
    | PiProviderToolCallContent
    | PiProviderOtherContent;

export interface PiProviderUsage {
    input?: unknown;
    output?: unknown;
    cacheRead?: unknown;
    cacheWrite?: unknown;
    totalTokens?: unknown;
}

export interface PiProviderMessage {
    role?: string;
    content?: unknown;
    usage?: PiProviderUsage;
}

export interface PiProviderEvent {
    type?: string;
    message?: PiProviderMessage;
}

export interface PiProviderToolCallPartial {
    content?: unknown[];
}

export interface PiProviderToolCall {
    name?: unknown;
    id?: unknown;
    arguments?: unknown;
    partialJson?: unknown;
}

export interface PiProviderAssistantMessageEvent {
    type?: unknown;
    content?: unknown;
    delta?: unknown;
    partial?: PiProviderToolCallPartial;
    contentIndex?: unknown;
    toolCall?: PiProviderToolCall;
}

export interface PiProviderSessionEvent {
    type?: unknown;
    sessionId?: unknown;
    session_id?: unknown;
    id?: unknown;
}

export interface PiProviderMessageUpdateEvent {
    type?: unknown;
    assistantMessageEvent?: PiProviderAssistantMessageEvent;
    message?: PiProviderMessage;
}

export interface PiProviderMessageEndEvent {
    type?: unknown;
    message?: PiProviderMessage;
}

export interface PiProviderTurnEndEvent {
    type?: unknown;
    message?: PiProviderMessage;
}

export interface PiProviderToolExecutionEvent {
    type?: unknown;
    toolName?: unknown;
}
