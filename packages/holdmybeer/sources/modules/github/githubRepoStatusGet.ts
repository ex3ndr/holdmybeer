import type { GitHubRepoStatus } from "@/modules/github/githubTypes.js";
import { commandRun } from "@/modules/util/commandRun.js";
import { text, textFormatKey } from "@text";

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
    throw new Error(textFormatKey("error_repo_status_check", { repo: fullName, detail: result.stderr || result.stdout }));
  }

  const size = Number(result.stdout.trim());
  if (Number.isFinite(size) && size === 0) {
    return "empty";
  }

  return "nonEmpty";
}
