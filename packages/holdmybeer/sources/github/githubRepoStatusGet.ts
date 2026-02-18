import type { GitHubRepoStatus } from "./githubTypes.js";
import { commandRun } from "../util/commandRun.js";
import { text, textFormat } from "@text";

/**
 * Checks repository status for publish targeting.
 * missing: not found, empty: exists with no content, nonEmpty: contains content.
 */
export async function githubRepoStatusGet(fullName: string): Promise<GitHubRepoStatus> {
  const result = await commandRun(
    "gh",
    ["api", `repos/${fullName}`, "--jq", ".size"],
    { allowFailure: true }
  );

  if (result.exitCode !== 0) {
    if (result.stderr.includes("404") || result.stdout.includes("404")) {
      return "missing";
    }
    throw new Error(textFormat(text["error_repo_status_check"]!, { repo: fullName, detail: result.stderr || result.stdout }));
  }

  const size = Number(result.stdout.trim());
  if (Number.isFinite(size) && size === 0) {
    return "empty";
  }

  return "nonEmpty";
}
