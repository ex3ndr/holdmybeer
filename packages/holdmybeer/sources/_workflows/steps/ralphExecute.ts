import { readFile } from "node:fs/promises";
import path from "node:path";
import { text } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import type { Context } from "@/types";

const executePromptTemplate = [
    "Implement this build goal in the current repository: {{buildGoal}}",
    "Use this finalized plan as the exact scope of work:",
    "{{planContent}}",
    "Execution rules:",
    "- apply code and test changes directly in the repository",
    "- keep changes minimal and composable",
    "- run relevant tests and typecheck before final response",
    "- summarize files changed and checks run"
].join("\n\n");

/**
 * Executes the finalized ralph plan with codex-xhigh.
 * Expects: planPath points to an existing plan markdown file.
 */
export async function ralphExecute(
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
            progressMessage: text.inference_ralph_executing!,
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
