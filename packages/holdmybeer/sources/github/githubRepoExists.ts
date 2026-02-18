import { commandRun } from "../util/commandRun.js";

/**
 * Checks whether a GitHub repository exists and is accessible.
 */
export async function githubRepoExists(fullName: string): Promise<boolean> {
  const result = await commandRun(
    "gh",
    ["repo", "view", fullName, "--json", "nameWithOwner"],
    { allowFailure: true }
  );
  return result.exitCode === 0;
}
