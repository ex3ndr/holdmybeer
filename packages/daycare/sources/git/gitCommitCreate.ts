import { commandRun } from "../util/commandRun.js";

/**
 * Stages all files and creates a commit when there are staged changes.
 */
export async function gitCommitCreate(message: string): Promise<boolean> {
  await commandRun("git", ["add", "."]);

  const hasChanges = await commandRun("git", ["diff", "--cached", "--quiet"], {
    allowFailure: true
  });

  if (hasChanges.exitCode === 0) {
    return false;
  }

  await commandRun("git", ["commit", "-m", message]);
  return true;
}
