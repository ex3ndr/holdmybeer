import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Recreates a shallow clone of the repository at targetDir.
 * Returns the HEAD commit hash of the checkout for reproducibility.
 */
export async function gitRepoCheckout(remoteUrl: string, targetDir: string): Promise<string> {
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(path.dirname(targetDir), { recursive: true });
    await commandRun("git", ["clone", "--depth", "1", remoteUrl, targetDir]);

    const result = await commandRun("git", ["rev-parse", "HEAD"], { cwd: targetDir });
    return result.stdout.trim();
}
