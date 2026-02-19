import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { text } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import { ralphLoopPlanPathResolve } from "@/_workflows/steps/ralphLoopPlanPathResolve.js";
import type { Context } from "@/types";

export interface RalphLoopPlanGenerateOptions {
    planPath?: string;
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
    ctx: Context,
    buildGoal: string,
    options: RalphLoopPlanGenerateOptions = {}
): Promise<{ planPath: string; provider?: string; sessionId?: string; text: string }> {
    const goal = buildGoal.trim();
    if (!goal) {
        throw new Error("Build goal is required.");
    }

    const planPath = options.planPath ?? ralphLoopPlanPathResolve(ctx, goal);
    const result = await generate(
        ctx,
        planPromptTemplate,
        { buildGoal: goal },
        {
            progressMessage: text.inference_plan_generating!,
            modelSelectionMode: "codex-xhigh",
            writePolicy: { mode: "read-only" }
        }
    );

    const planText = result.text.trim();
    if (!planText) {
        throw new Error("Inference returned empty plan.");
    }

    const absolutePath = path.resolve(ctx.projectPath, planPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${planText}\n`, "utf-8");
    return {
        planPath,
        provider: result.provider,
        sessionId: result.sessionId,
        text: planText
    };
}
