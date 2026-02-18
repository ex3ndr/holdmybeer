import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import { ralphLoopExecute } from "@/workflows/steps/ralphLoopExecute.js";
import { ralphLoopPlanGenerate } from "@/workflows/steps/ralphLoopPlanGenerate.js";
import { ralphLoopReviewRound } from "@/workflows/steps/ralphLoopReviewRound.js";
import { text } from "@text";

/**
 * Runs the ralph-loop workflow: ask goal, plan, execute, and review in 3 rounds.
 * Expects: projectPath is the repository root for execution and review writes.
 */
export async function ralphLoopWorkflow(projectPath: string): Promise<void> {
  const context = await contextGetOrInitialize(projectPath);
  const showInferenceProgress = true;

  const buildGoal = await promptInput(text["prompt_ralph_loop_build"]!);
  if (!buildGoal.trim()) {
    throw new Error(text["error_ralph_loop_goal_required"]!);
  }

  const plan = await ralphLoopPlanGenerate(buildGoal, {
    showProgress: showInferenceProgress,
    projectPath: context.projectPath
  });

  await ralphLoopExecute(buildGoal, plan.planPath, {
    showProgress: showInferenceProgress,
    projectPath: context.projectPath
  });

  for (let round = 1; round <= 3; round += 1) {
    await ralphLoopReviewRound(round, plan.planPath, {
      showProgress: showInferenceProgress,
      projectPath: context.projectPath
    });
  }
}
