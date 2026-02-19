import { readFile } from "node:fs/promises";
import path from "node:path";
import { text } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import type { Context } from "@/types";

const executePromptTemplate = [
    "Implement this request in the current repository: {{buildGoal}}",
    "Follow this plan exactly, then complete all pending implementation and test tasks:",
    "{{planContent}}",
    "Execution rules:",
    "- apply code and test changes directly in the repository",
    "- keep changes minimal and composable",
    "- run relevant tests/typechecks before final response",
    "- in final response, summarize what changed and what checks were run"
].join("\n\n");

/**
 * Executes the generated ralph-loop plan using built-in inference.
 * Expects: planPath points to an existing markdown plan file.
 */
export async function ralphLoopExecute(
    ctx: Context,
    buildGoal: string,
    planPath: string
): Promise<{ provider?: string; sessionId?: string; text: string }> {
    const projectPath = ctx.projectPath;
    const planContent = await readFile(path.resolve(projectPath, planPath), "utf-8");
    const result = await generate(
        ctx,
        executePromptTemplate,
        {
            buildGoal: buildGoal.trim(),
            planContent
        },
        {
            progressMessage: text.inference_plan_executing!,
            modelSelectionMode: "codex-xhigh",
            writePolicy: {
                mode: "write-whitelist",
                writablePaths: [projectPath]
            }
        }
    );
    return {
        provider: result.provider,
        sessionId: result.sessionId,
        text: result.text.trim()
    };
}
