import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const gitignoreEntryBeerLocal = ".beer/local/";

/**
 * Ensures root .gitignore exists and ignores .beer/local runtime artifacts.
 * Expects: cwd is the project root.
 */
export async function gitignoreEnsure(cwd: string): Promise<void> {
    const gitignorePath = path.join(cwd, ".gitignore");
    const existing = await gitignoreRead(gitignorePath);
    const normalized = existing.replace(/\r\n/g, "\n");

    if (gitignoreHasEntry(normalized, gitignoreEntryBeerLocal)) {
        if (existing !== normalized) {
            await writeFile(gitignorePath, normalized, "utf-8");
        }
        return;
    }

    const prefix = normalized.length === 0 ? "" : normalized.endsWith("\n") ? normalized : `${normalized}\n`;
    await writeFile(gitignorePath, `${prefix}${gitignoreEntryBeerLocal}\n`, "utf-8");
}

async function gitignoreRead(gitignorePath: string): Promise<string> {
    try {
        return await readFile(gitignorePath, "utf-8");
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            return "";
        }
        throw error;
    }
}

function gitignoreHasEntry(content: string, entry: string): boolean {
    return content.split("\n").some((line) => line.trim() === entry || line.trim() === entry.replace(/\/$/, ""));
}
