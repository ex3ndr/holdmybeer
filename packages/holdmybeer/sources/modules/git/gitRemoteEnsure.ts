import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Ensures origin points to the target remote URL.
 * Expects: cwd is the git repository root.
 */
export async function gitRemoteEnsure(remoteUrl: string, cwd: string): Promise<void> {
  const existing = await commandRun("git", ["remote", "get-url", "origin"], {
    cwd,
    allowFailure: true
  });

  if (existing.exitCode !== 0) {
    await commandRun("git", ["remote", "add", "origin", remoteUrl], { cwd });
    return;
  }

  const current = existing.stdout.trim();
  if (current !== remoteUrl) {
    await commandRun("git", ["remote", "set-url", "origin", remoteUrl], { cwd });
  }
}
