import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Pushes current HEAD to the target remote branch.
 * Expects: cwd is the git repository root.
 */
export async function gitPush(remote: string, branch: string, cwd: string): Promise<void> {
    await commandRun("git", ["push", "-u", remote, `HEAD:${branch}`], { cwd });
}
