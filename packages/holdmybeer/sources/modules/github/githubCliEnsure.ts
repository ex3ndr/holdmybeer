import { text } from "@text";
import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Verifies GitHub CLI is installed and callable.
 * Throws with a clear message when unavailable.
 */
export async function githubCliEnsure(): Promise<void> {
    const result = await commandRun("gh", ["--version"], { allowFailure: true });
    if (result.exitCode !== 0) {
        throw new Error(text.error_gh_required!);
    }
}
