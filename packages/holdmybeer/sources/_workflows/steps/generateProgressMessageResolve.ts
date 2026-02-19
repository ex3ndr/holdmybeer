import type { GenerateEvent } from "@/types";

/**
 * Resolves a user-facing progress message for inference events.
 * Expects: baseMessage is already trimmed and non-empty.
 */
export function generateProgressMessageResolve(
    baseMessage: string,
    event: GenerateEvent,
    previousTokenCount = 0
): { message: string; tokenCount: number } {
    const tokenCount = Math.max(previousTokenCount, generateEventTokenCountResolve(event) ?? 0);
    const label = generateEventHumanize(event);
    return {
        message: `${baseMessage} (${label}, tokens ${tokenCount})`,
        tokenCount
    };
}

function generateEventHumanize(event: GenerateEvent): string {
    switch (event.type) {
        case "provider_status":
            return event.status === "started" ? "starting" : "working";
        case "thinking":
            return "thinking";
        case "tool_call":
            return event.toolName ? generateToolHumanize(event.toolName) : "using tools";
        case "text":
            return "writing";
        case "usage":
            return "writing";
        default:
            return "working";
    }
}

function generateEventTokenCountResolve(event: GenerateEvent): number | undefined {
    if (event.type === "usage") {
        return event.tokens.total;
    }
    if (event.type === "provider_status") {
        return event.tokens?.total;
    }
    if (event.type === "thinking" || event.type === "tool_call" || event.type === "text") {
        return event.tokens?.total;
    }
    return undefined;
}

/** Maps provider tool names to short user-facing labels. */
function generateToolHumanize(toolName: string): string {
    switch (toolName) {
        case "Read":
        case "read_file":
            return "reading files";
        case "Write":
        case "write_file":
            return "writing files";
        case "Edit":
        case "edit_file":
            return "editing files";
        case "Bash":
        case "bash":
        case "execute_command":
            return "running command";
        case "Grep":
        case "grep":
        case "search":
            return "searching code";
        case "Glob":
        case "glob":
        case "list_files":
            return "finding files";
        case "WebFetch":
        case "web_fetch":
            return "fetching web content";
        case "WebSearch":
        case "web_search":
            return "searching web";
        default:
            return `using ${toolName}`;
    }
}
