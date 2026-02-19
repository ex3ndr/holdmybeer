import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Ensures .gitignore contains each requested pattern exactly once.
 * Expects: projectPath is repository root and patterns are gitignore entries.
 */
export async function contextGitignoreEnsure(projectPath: string, patterns: readonly string[]): Promise<void> {
    const gitignorePath = path.join(projectPath, ".gitignore");
    const normalizedPatterns = contextGitignorePatternsNormalize(patterns);
    if (normalizedPatterns.length === 0) {
        return;
    }

    const existing = await contextGitignoreRead(gitignorePath);
    const normalized = existing.replace(/\r\n/g, "\n");
    const missing = normalizedPatterns.filter((pattern) => !contextGitignoreHasEntry(normalized, pattern));
    if (missing.length === 0) {
        if (existing !== normalized) {
            await writeFile(gitignorePath, normalized, "utf-8");
        }
        return;
    }

    const prefix = normalized.length === 0 ? "" : normalized.endsWith("\n") ? normalized : `${normalized}\n`;
    await writeFile(gitignorePath, `${prefix}${missing.join("\n")}\n`, "utf-8");
}

async function contextGitignoreRead(gitignorePath: string): Promise<string> {
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

function contextGitignorePatternsNormalize(patterns: readonly string[]): string[] {
    const out: string[] = [];
    for (const pattern of patterns) {
        const trimmed = pattern.trim();
        if (!trimmed) {
            continue;
        }
        if (out.some((existing) => contextGitignoreEntriesEqual(existing, trimmed))) {
            continue;
        }
        out.push(trimmed);
    }
    return out;
}

function contextGitignoreHasEntry(content: string, entry: string): boolean {
    return content
        .split("\n")
        .map((line) => line.trim())
        .some((line) => contextGitignoreEntriesEqual(line, entry));
}

function contextGitignoreEntriesEqual(left: string, right: string): boolean {
    return left === right || left === right.replace(/\/$/, "") || left.replace(/\/$/, "") === right;
}
