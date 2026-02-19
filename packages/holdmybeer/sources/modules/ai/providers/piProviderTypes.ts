export interface PiProviderTextContent {
    type: "text";
    text: string;
}

export interface PiProviderOtherContent {
    type?: string;
    text?: unknown;
}

export type PiProviderContent = PiProviderTextContent | PiProviderOtherContent;

export interface PiProviderMessage {
    role?: string;
    content?: unknown;
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
}

export interface PiProviderAssistantMessageEvent {
    type?: unknown;
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
}

export interface PiProviderToolExecutionEvent {
    type?: unknown;
    toolName?: unknown;
}
