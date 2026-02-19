import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { treeChildrenWrite } from "@/modules/tree/treeChildrenWrite.js";

describe("treeChildrenWrite", () => {
    it("creates parent dirs and writes children.json", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-children-write-"));
        try {
            const nodeDir = path.join(tempDir, "a", "b");
            await treeChildrenWrite(nodeDir, [{ title: "Auth", slug: "auth" }]);

            const raw = await readFile(path.join(nodeDir, "children.json"), "utf-8");
            expect(JSON.parse(raw)).toEqual([{ title: "Auth", slug: "auth" }]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("overwrites existing file content", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-children-write-"));
        try {
            const nodeDir = path.join(tempDir, "node");
            await treeChildrenWrite(nodeDir, [{ title: "Old", slug: "old" }]);
            await writeFile(path.join(nodeDir, "children.json"), "[]\n", "utf-8");

            await treeChildrenWrite(nodeDir, [{ title: "New", slug: "new" }]);
            const raw = await readFile(path.join(nodeDir, "children.json"), "utf-8");
            expect(JSON.parse(raw)).toEqual([{ title: "New", slug: "new" }]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
