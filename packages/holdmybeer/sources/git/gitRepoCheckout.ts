import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { commandRun } from "../util/commandRun.js";

/**
 * Recreates a shallow clone of the repository at targetDir.
 */
export async function gitRepoCheckout(remoteUrl: string, targetDir: string): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(path.dirname(targetDir), { recursive: true });
  await commandRun("git", ["clone", "--depth", "1", remoteUrl, targetDir]);
}
