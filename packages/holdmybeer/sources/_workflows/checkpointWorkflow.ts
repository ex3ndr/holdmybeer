import { text } from "@text";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { Context } from "@/types";

/**
 * Runs a direct checkpoint workflow with an optional commit message hint.
 * Expects: repository is initialized and configured for pushing to origin/main.
 */
export async function checkpointWorkflow(ctx: Context): Promise<void> {
    const hint = (await promptInput(text.prompt_checkpoint_hint!)).trim();
    await ctx.checkpoint(hint || undefined, { remote: "origin", branch: "main" });
}
