import { commandRun } from "../util/commandRun.js";

export type GitHubRepoVisibility = "private" | "public";

/**
 * Creates a GitHub repository via gh CLI.
 */
export async function githubRepoCreate(
  fullName: string,
  visibility: GitHubRepoVisibility
): Promise<void> {
  const visibilityFlag = visibility === "private" ? "--private" : "--public";
  await commandRun("gh", [
    "repo",
    "create",
    fullName,
    visibilityFlag,
    "--disable-issues",
    "--disable-wiki",
    "--confirm"
  ]);
}
