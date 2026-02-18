import { commandRun } from "../util/commandRun.js";

/**
 * Ensures origin points to the target remote URL.
 */
export async function gitRemoteEnsure(remoteUrl: string): Promise<void> {
  const existing = await commandRun("git", ["remote", "get-url", "origin"], {
    allowFailure: true
  });

  if (existing.exitCode !== 0) {
    await commandRun("git", ["remote", "add", "origin", remoteUrl]);
    return;
  }

  const current = existing.stdout.trim();
  if (current !== remoteUrl) {
    await commandRun("git", ["remote", "set-url", "origin", remoteUrl]);
  }
}
