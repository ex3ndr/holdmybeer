import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { gitignoreEnsure } from "@/modules/git/gitignoreEnsure.js";

const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("gitignoreEnsure", () => {
    it("creates root .gitignore when missing", async () => {
        const cwd = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-gitignore-"));
        tempDirs.push(cwd);

        await gitignoreEnsure(cwd);

        const content = await readFile(path.join(cwd, ".gitignore"), "utf-8");
        expect(content).toBe(".beer/local/\n");
    });

    it("appends .beer/local/ without removing existing entries", async () => {
        const cwd = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-gitignore-"));
        tempDirs.push(cwd);
        await writeFile(path.join(cwd, ".gitignore"), "node_modules/\n", "utf-8");

        await gitignoreEnsure(cwd);

        const content = await readFile(path.join(cwd, ".gitignore"), "utf-8");
        expect(content).toBe("node_modules/\n.beer/local/\n");
    });

    it("does not duplicate .beer/local entry", async () => {
        const cwd = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-gitignore-"));
        tempDirs.push(cwd);
        await writeFile(path.join(cwd, ".gitignore"), ".beer/local/\n", "utf-8");

        await gitignoreEnsure(cwd);

        const content = await readFile(path.join(cwd, ".gitignore"), "utf-8");
        expect(content).toBe(".beer/local/\n");
    });
});
