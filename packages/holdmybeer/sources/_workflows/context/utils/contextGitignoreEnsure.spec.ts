import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { contextGitignoreEnsure } from "@/_workflows/context/utils/contextGitignoreEnsure.js";

const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("contextGitignoreEnsure", () => {
    it("creates .gitignore with provided patterns when missing", async () => {
        const projectPath = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-gitignore-"));
        tempDirs.push(projectPath);

        await contextGitignoreEnsure(projectPath, [".beer/local/", ".cache/"]);

        const content = await readFile(path.join(projectPath, ".gitignore"), "utf-8");
        expect(content).toBe(".beer/local/\n.cache/\n");
    });

    it("appends only missing patterns and preserves existing entries", async () => {
        const projectPath = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-gitignore-"));
        tempDirs.push(projectPath);
        await writeFile(path.join(projectPath, ".gitignore"), "node_modules/\n", "utf-8");

        await contextGitignoreEnsure(projectPath, [".beer/local/", "node_modules/"]);

        const content = await readFile(path.join(projectPath, ".gitignore"), "utf-8");
        expect(content).toBe("node_modules/\n.beer/local/\n");
    });

    it("does not duplicate entries when slash variants already exist", async () => {
        const projectPath = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-gitignore-"));
        tempDirs.push(projectPath);
        await writeFile(path.join(projectPath, ".gitignore"), ".beer/local\n", "utf-8");

        await contextGitignoreEnsure(projectPath, [".beer/local/", ".beer/local/"]);

        const content = await readFile(path.join(projectPath, ".gitignore"), "utf-8");
        expect(content).toBe(".beer/local\n");
    });
});
