import { text } from "@text";
import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Returns the authenticated GitHub login from gh auth.
 */
export async function githubViewerGet(): Promise<string> {
    const result = await commandRun("gh", ["api", "user", "--jq", ".login"]);
    const login = result.stdout.trim();
    if (!login) {
        throw new Error(text.error_gh_user_resolve!);
    }
    return login;
}
