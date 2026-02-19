import { commandRun } from "@/modules/util/commandRun.js";

/**
 * Returns candidate publish owners: authenticated user plus org memberships.
 */
export async function githubOwnerChoicesGet(viewerLogin: string): Promise<string[]> {
    const result = await commandRun("gh", ["api", "user/orgs", "--jq", ".[].login"], {
        allowFailure: true
    });

    const values = new Set<string>([viewerLogin]);
    if (result.exitCode === 0) {
        for (const line of result.stdout.split("\n")) {
            const value = line.trim();
            if (value) {
                values.add(value);
            }
        }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
}
