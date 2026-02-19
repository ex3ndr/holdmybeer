import { contextGet } from "@/modules/context/contextGet.js";
import { gitPush } from "@/modules/git/gitPush.js";
import { gitignoreEnsure } from "@/modules/git/gitignoreEnsure.js";

export interface PushMainOptions {
  showProgress?: boolean;
  remote?: string;
  branch?: string;
}

/**
 * Ensures required .gitignore entries, creates commit from all tracked changes, and pushes to main.
 * Expects: global context is initialized and remote/branch already exist.
 */
export async function pushMain(
  commitMessage: string,
  options: PushMainOptions = {}
): Promise<{ committed: boolean }> {
  const messageResolved = commitMessage.trim();
  if (!messageResolved) {
    throw new Error("Commit message is required.");
  }

  const context = contextGet();
  await gitignoreEnsure(context.projectPath);
  const committed = await context.stageAndCommit(messageResolved);
  const remote = options.remote ?? "origin";
  const branch = options.branch ?? "main";
  await gitPush(remote, branch, context.projectPath);
  return {
    committed
  };
}
