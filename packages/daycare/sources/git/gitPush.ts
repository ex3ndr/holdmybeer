import { commandRun } from "../util/commandRun.js";

/**
 * Pushes current HEAD to the target remote branch.
 */
export async function gitPush(remote: string, branch: string): Promise<void> {
  await commandRun("git", ["push", "-u", remote, `HEAD:${branch}`]);
}
