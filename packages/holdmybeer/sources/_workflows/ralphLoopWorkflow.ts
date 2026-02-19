import { text } from "@text";
import { ralphLoopExecute } from "@/_workflows/steps/ralphLoopExecute.js";
import { ralphLoopPlanGenerate } from "@/_workflows/steps/ralphLoopPlanGenerate.js";
import { ralphLoopReviewRound } from "@/_workflows/steps/ralphLoopReviewRound.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { Context } from "@/types";

/**
 * Runs the ralph-loop workflow: ask goal, plan, execute, and review in 3 rounds.
 * Expects: ctx.projectPath is the repository root for execution and review writes.
 */
export async function ralphLoopWorkflow(ctx: Context): Promise<void> {
    const buildGoal = await promptInput(text.prompt_ralph_loop_build!);
    if (!buildGoal.trim()) {
        throw new Error(text.error_ralph_loop_goal_required!);
    }

    const plan = await ralphLoopPlanGenerate(ctx, buildGoal);

    await ralphLoopExecute(ctx, buildGoal, plan.planPath);

    for (let round = 1; round <= 3; round += 1) {
        await ralphLoopReviewRound(ctx, round, plan.planPath);
    }
}
