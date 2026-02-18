import { readFile } from "node:fs/promises";
import path from "node:path";
import { runInference } from "@/_workflows/steps/runInference.js";

export interface RalphLoopExecuteOptions {
  showProgress?: boolean;
  projectPath?: string;
}

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
  buildGoal: string,
  planPath: string,
  options: RalphLoopExecuteOptions = {}
): Promise<{ provider?: string; text: string }> {
  const projectPath = options.projectPath ?? process.cwd();
  const planContent = await readFile(path.resolve(projectPath, planPath), "utf-8");
  const result = await runInference(executePromptTemplate, {
    buildGoal: buildGoal.trim(),
    planContent
  }, {
    showProgress: options.showProgress,
    modelSelectionMode: "quality",
    writePolicy: {
      mode: "write-whitelist",
      writablePaths: [projectPath]
    }
  });
  return {
    provider: result.provider,
    text: result.text.trim()
  };
}
