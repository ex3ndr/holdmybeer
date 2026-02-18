import type { GitHubRepoRef } from "./githubTypes.js";

/**
 * Parses GitHub repository input into owner/repo.
 * Supports URLs, SSH remotes, and owner/repo shorthand.
 */
export function githubRepoParse(input: string): GitHubRepoRef | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^ssh:\/\//i, "")
    .replace(/^git@github\.com:/i, "github.com/")
    .replace(/\.git$/i, "");

  const withoutQuery = withoutProtocol.split(/[?#]/)[0] ?? "";
  const normalized = withoutQuery.startsWith("github.com/")
    ? withoutQuery.slice("github.com/".length)
    : withoutQuery;

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0] ?? "";
  const repo = parts[1] ?? "";
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    return null;
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`
  };
}
