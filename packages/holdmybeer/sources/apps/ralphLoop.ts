import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import { ralphLoopExecute } from "@/workflows/steps/ralphLoopExecute.js";
import { ralphLoopPlanGenerate } from "@/workflows/steps/ralphLoopPlanGenerate.js";
import { ralphLoopReviewRound } from "@/workflows/steps/ralphLoopReviewRound.js";
import { beerLog, text } from "@text";

/**
 * Runs a ralph-loop workflow: ask goal, plan, execute, and review in 3 rounds.
 */
export async function ralphLoop(projectPath: string): Promise<void> {
  beerLog("ralph_loop_start");
  const context = await contextGetOrInitialize(projectPath);
  const showInferenceProgress = true;

  const buildGoal = await promptInput(text["prompt_ralph_loop_build"]!);
  if (!buildGoal.trim()) {
    throw new Error(text["error_ralph_loop_goal_required"]!);
  }
  beerLog("ralph_loop_goal", { goal: buildGoal });

  beerLog("ralph_loop_plan_start");
  const plan = await ralphLoopPlanGenerate(buildGoal, {
    showProgress: showInferenceProgress,
    projectPath: context.projectPath
  });
  beerLog("ralph_loop_plan_done", {
    path: plan.planPath,
    provider: plan.provider ?? "unknown"
  });

  beerLog("ralph_loop_execute_start");
  const execution = await ralphLoopExecute(buildGoal, plan.planPath, {
    showProgress: showInferenceProgress,
    projectPath: context.projectPath
  });
  beerLog("ralph_loop_execute_done", { provider: execution.provider ?? "unknown" });

  for (let round = 1; round <= 3; round += 1) {
    beerLog("ralph_loop_review_start", { round });
    const review = await ralphLoopReviewRound(round, plan.planPath, {
      showProgress: showInferenceProgress,
      projectPath: context.projectPath
    });
    beerLog("ralph_loop_review_done", {
      round,
      provider: review.provider ?? "unknown"
    });
  }

  beerLog("ralph_loop_done", { path: plan.planPath });
}
