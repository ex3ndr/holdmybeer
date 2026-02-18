import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runInference } from "@/workflows/steps/runInference.js";
import { ralphLoopPlanPathResolve } from "@/workflows/steps/ralphLoopPlanPathResolve.js";

export interface RalphLoopPlanGenerateOptions {
  showProgress?: boolean;
  planPath?: string;
  projectPath?: string;
}

const planPromptTemplate = [
  "Create a markdown implementation plan for this request: {{buildGoal}}",
  "Output only the final plan markdown (no wrappers).",
  "Plan requirements:",
  "- include Overview",
  "- include Validation Commands",
  "- include Implementation Steps with checkbox tasks",
  "- include test tasks for each code task",
  "- keep steps concrete and scoped to this repository",
  "- avoid placeholders like TBD"
].join("\n");

/**
 * Generates a plan markdown file for ralph-loop via built-in inference.
 * Expects: buildGoal is non-empty user intent and planPath is repo-relative when provided.
 */
export async function ralphLoopPlanGenerate(
  buildGoal: string,
  options: RalphLoopPlanGenerateOptions = {}
): Promise<{ planPath: string; provider?: string; text: string }> {
  const goal = buildGoal.trim();
  if (!goal) {
    throw new Error("Build goal is required.");
  }

  const planPath = options.planPath ?? ralphLoopPlanPathResolve(goal);
  const result = await runInference(planPromptTemplate, { buildGoal: goal }, {
    showProgress: options.showProgress,
    modelSelectionMode: "quality",
    writePolicy: { mode: "read-only" }
  });

  const text = result.text.trim();
  if (!text) {
    throw new Error("Inference returned empty plan.");
  }

  const absolutePath = path.resolve(options.projectPath ?? process.cwd(), planPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${text}\n`, "utf-8");
  return {
    planPath,
    provider: result.provider,
    text
  };
}
