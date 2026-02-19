import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Stages all files and creates a commit in the given directory.
 * Returns true if a commit was created, false if there were no changes.
 */
export async function gitStageAndCommit(message: string, cwd: string): Promise<boolean> {
    await commandRun("git", ["add", "."], { cwd });

    const hasChanges = await commandRun("git", ["diff", "--cached", "--quiet"], {
        cwd,
        allowFailure: true
    });

    if (hasChanges.exitCode === 0) {
        return false;
    }

    await commandRun("git", ["commit", "-m", message], { cwd });
    return true;
}
