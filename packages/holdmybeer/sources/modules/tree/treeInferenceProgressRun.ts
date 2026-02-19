import { generateProgressMessageResolve } from "@/_workflows/steps/generateProgressMessageResolve.js";
import type { Context, GenerateEvent } from "@/types";

/**
 * Runs one inference call under a dedicated progress line with event-based status updates.
 * Expects: message is a user-facing base progress label and run forwards onEvent into inference.
 */
export async function treeInferenceProgressRun<T>(
    ctx: Context,
    message: string,
    run: (onEvent: (event: GenerateEvent) => void) => Promise<T>
): Promise<T> {
    let progressTokenCount = 0;

    return ctx.progress(`${message} (starting, tokens 0)`, async (report) => {
        return run((event) => {
            const updated = generateProgressMessageResolve(message, event, progressTokenCount);
            progressTokenCount = updated.tokenCount;
            report(updated.message);
        });
    });
}
