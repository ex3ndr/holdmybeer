import { text } from "@text";
import type { GitHubRepoStatus } from "@/modules/github/githubTypes.js";

export interface GitHubRepoNameResolveOptions {
    owner: string;
    requestedRepo: string;
    statusGet: (fullName: string) => Promise<GitHubRepoStatus>;
}

export interface GitHubRepoNameResolveResult {
    repo: string;
    fullName: string;
    status: GitHubRepoStatus;
}

/**
 * Resolves a publish repository name, adding numeric suffixes for collisions.
 * Existing empty repositories are accepted as-is.
 */
export async function githubRepoNameResolve(
    options: GitHubRepoNameResolveOptions
): Promise<GitHubRepoNameResolveResult> {
    const requested = options.requestedRepo.trim();
    if (!requested || !/^[A-Za-z0-9_.-]+$/.test(requested)) {
        throw new Error(text.error_repo_name_invalid!);
    }

    const firstFullName = `${options.owner}/${requested}`;
    const firstStatus = await options.statusGet(firstFullName);
    if (firstStatus === "missing" || firstStatus === "empty") {
        return {
            repo: requested,
            fullName: firstFullName,
            status: firstStatus
        };
    }

    for (let suffix = 2; suffix <= 100; suffix += 1) {
        const repo = `${requested}-${suffix}`;
        const fullName = `${options.owner}/${repo}`;
        const status = await options.statusGet(fullName);
        if (status === "missing" || status === "empty") {
            return {
                repo,
                fullName,
                status
            };
        }
    }

    throw new Error(text.error_repo_name_exhausted!);
}
