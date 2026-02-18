import { generateFile } from "@/modules/ai/generateFile.js";
import { contextGet } from "@/modules/context/contextGet.js";
import { gitPush } from "@/modules/git/gitPush.js";

export interface PushMainOptions {
  showProgress?: boolean;
  remote?: string;
  branch?: string;
}

const gitignorePrompt = [
  "Update .gitignore for this repository.",
  "Decide which files and folders are garbage and should be ignored before commit.",
  "Keep required source, config, and lock files tracked.",
  "Preserve useful existing entries and remove duplicates.",
  "Return the full final .gitignore content."
].join("\n");

/**
 * Maintains .gitignore, creates commit from all tracked changes, and pushes to main.
 * Expects: global context is initialized and remote/branch already exist.
 */
export async function pushMain(
  commitMessage: string,
  options: PushMainOptions = {}
): Promise<{ committed: boolean; provider?: string }> {
  const messageResolved = commitMessage.trim();
  if (!messageResolved) {
    throw new Error("Commit message is required.");
  }

  const context = contextGet();
  const gitignore = await generateFile(context, gitignorePrompt, ".gitignore", {
    showProgress: options.showProgress,
    modelSelectionMode: "quality",
    retries: 1
  });
  const committed = await context.stageAndCommit(messageResolved);
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "main";
  await gitPush(remote, branch, context.projectPath);
  return {
    committed,
    provider: gitignore.provider
  };
}
