import { githubRepoExists } from "@/modules/github/githubRepoExists.js";
import { githubRepoParse } from "@/modules/github/githubRepoParse.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { GitHubRepoRef } from "@/types";

/**
 * Prompts until a valid and accessible GitHub repository is provided.
 * Expects: question is a non-empty prompt text for the user.
 */
export async function contextAskGithubRepo(question: string, defaultValue?: string): Promise<GitHubRepoRef> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const input = await promptInput(question, defaultValue);
        const parsed = githubRepoParse(input);
        if (!parsed) {
            continue;
        }

        const exists = await githubRepoExists(parsed.fullName);
        if (!exists) {
            continue;
        }

        return parsed;
    }
}
