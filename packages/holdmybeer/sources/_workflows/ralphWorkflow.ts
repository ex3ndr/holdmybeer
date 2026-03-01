import { text } from "@text";
import { ralphExecute } from "@/_workflows/steps/ralphExecute.js";
import { ralphPlan } from "@/_workflows/steps/ralphPlan.js";
import { ralphReview } from "@/_workflows/steps/ralphReview.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { Context } from "@/types";

/**
 * Runs the ralph workflow: plan with Opus, execute with codex-xhigh, and review with codex-high.
 * Expects: ctx.projectPath is repository root for execution and review write operations.
 */
export async function ralphWorkflow(ctx: Context): Promise<void> {
    const buildGoal = await promptInput(text.prompt_ralph_goal!);
    if (!buildGoal.trim()) {
        throw new Error(text.error_ralph_goal_required!);
    }

    const plan = await ralphPlan(ctx, buildGoal);
    await ralphExecute(ctx, buildGoal, plan.planPath);
    await ralphReview(ctx, plan.planPath);
}
