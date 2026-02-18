import { promptInput } from "@/modules/prompt/promptInput.js";
import { ralphLoopExecute } from "@/_workflows/steps/ralphLoopExecute.js";
import { ralphLoopPlanGenerate } from "@/_workflows/steps/ralphLoopPlanGenerate.js";
import { ralphLoopReviewRound } from "@/_workflows/steps/ralphLoopReviewRound.js";
import type { Context } from "@/types";
import { text } from "@text";

/**
 * Runs the ralph-loop workflow: ask goal, plan, execute, and review in 3 rounds.
 * Expects: ctx.projectPath is the repository root for execution and review writes.
 */
export async function ralphLoopWorkflow(ctx: Context): Promise<void> {
  const showInferenceProgress = true;

  const buildGoal = await promptInput(text["prompt_ralph_loop_build"]!);
  if (!buildGoal.trim()) {
    throw new Error(text["error_ralph_loop_goal_required"]!);
  }

  const plan = await ralphLoopPlanGenerate(buildGoal, {
    showProgress: showInferenceProgress,
    projectPath: ctx.projectPath
  });

  await ralphLoopExecute(buildGoal, plan.planPath, {
    showProgress: showInferenceProgress,
    projectPath: ctx.projectPath
  });

  for (let round = 1; round <= 3; round += 1) {
    await ralphLoopReviewRound(round, plan.planPath, {
      showProgress: showInferenceProgress,
      projectPath: ctx.projectPath
    });
  }
}
