import { readFile } from "node:fs/promises";
import path from "node:path";
import { runInference } from "@/_workflows/steps/runInference.js";
import { textFormatKey } from "@text";

export interface RalphLoopReviewRoundOptions {
  showProgress?: boolean;
  projectPath?: string;
}

const reviewPromptTemplate = [
  "Run review round {{round}} of 3 for this implementation plan:",
  "{{planContent}}",
  "Review and fix workflow:",
  "- inspect changed code for bugs, regressions, and missing tests",
  "- apply necessary fixes directly in repository files",
  "- keep scope aligned to the plan",
  "- run relevant tests/typechecks",
  "- respond with findings fixed and remaining risks"
].join("\n\n");

/**
 * Runs one built-in-inference review round and applies fixes in-place.
 * Expects: round is 1..3 and planPath points to an existing plan file.
 */
export async function ralphLoopReviewRound(
  round: number,
  planPath: string,
  options: RalphLoopReviewRoundOptions = {}
): Promise<{ provider?: string; text: string }> {
  if (round < 1 || round > 3) {
    throw new Error(`Invalid review round: ${round}`);
  }

  const projectPath = options.projectPath ?? process.cwd();
  const planContent = await readFile(path.resolve(projectPath, planPath), "utf-8");
  const result = await runInference(reviewPromptTemplate, {
    round,
    planContent
  }, {
    progressMessage: textFormatKey("inference_review_round", { round }),
    showProgress: options.showProgress,
    modelSelectionMode: "codex-xhigh",
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
