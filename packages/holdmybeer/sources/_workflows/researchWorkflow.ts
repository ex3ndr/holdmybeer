import { text } from "@text";
import { type GenerateDocumentInput, generateDocument } from "@/_workflows/steps/generateDocument.js";
import type { Context } from "@/types";

const researchRuns: readonly (GenerateDocumentInput & { progressMessage: string })[] = [
    {
        promptId: "PROMPT_RESEARCH",
        outputPath: "doc/research.md",
        modelSelectionMode: "opus",
        progressMessage: text.inference_research_summary_opus_generating!
    },
    {
        promptId: "PROMPT_RESEARCH_PROBLEMS",
        outputPath: "doc/research-problems.md",
        modelSelectionMode: "codex-xhigh",
        progressMessage: text.inference_research_problems_codex_generating!
    }
];

/**
 * Runs research and unresolved-problems document generation in parallel.
 * Expects: bootstrap settings are already configured so prompt variables can be resolved.
 */
export async function researchWorkflow(ctx: Context): Promise<void> {
    await ctx.progresses(async (progresses) => {
        await Promise.all(
            researchRuns.map((run) => {
                const { progressMessage, ...input } = run;
                return progresses.run(progressMessage, async (report) => {
                    await generateDocument(ctx, input, {
                        onEvent: (event: string) => {
                            const updated = researchProgressMessageResolve(progressMessage, event);
                            if (updated) {
                                report(updated);
                            }
                        }
                    });
                });
            })
        );
    });
}

function researchProgressMessageResolve(baseMessage: string, event: string): string | null {
    const label = researchEventHumanize(event);
    if (!label) {
        return null;
    }
    return `${baseMessage} (${label})`;
}

function researchEventHumanize(event: string): string {
    const normalized = event.trim();
    if (!normalized) {
        return "";
    }

    const eventName = researchEventTokenResolve(normalized, "event");
    if (eventName) {
        return researchStreamEventHumanize(eventName, normalized);
    }

    if (normalized.endsWith(" started")) {
        return "starting";
    }

    return "";
}

function researchStreamEventHumanize(eventName: string, rawEvent: string): string {
    switch (eventName) {
        case "text_start":
        case "text_delta":
        case "text_end":
            return "writing";
        case "thinking_start":
        case "thinking_delta":
        case "thinking_end":
            return "thinking";
        case "toolcall_start":
        case "toolcall_delta":
        case "toolcall_end":
        case "tool_execution_start":
        case "tool_execution_end": {
            const tool = researchEventTokenResolve(rawEvent, "tool");
            return tool ? researchToolHumanize(tool) : "using tools";
        }
        default:
            return "";
    }
}

function researchToolHumanize(toolName: string): string {
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

function researchEventTokenResolve(event: string, key: string): string | undefined {
    const match = event.match(new RegExp(`(?:^|\\s)${key}=([^\\s]+)`));
    return match?.[1];
}
