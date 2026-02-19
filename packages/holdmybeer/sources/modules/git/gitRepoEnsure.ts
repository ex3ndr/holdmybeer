import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Ensures the target directory is an initialized git repository.
 * Expects: cwd points to the project root where bootstrap writes files.
 */
export async function gitRepoEnsure(cwd: string): Promise<void> {
    const check = await commandRun("git", ["rev-parse", "--is-inside-work-tree"], {
        cwd,
        allowFailure: true
    });
    if (check.exitCode === 0 && check.stdout.trim() === "true") {
        return;
    }

    await commandRun("git", ["init"], { cwd });
}
