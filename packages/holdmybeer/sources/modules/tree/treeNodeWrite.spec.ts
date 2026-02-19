import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { treeNodeWrite } from "@/modules/tree/treeNodeWrite.js";

describe("treeNodeWrite", () => {
    it("creates parent dirs and writes node.json", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-node-write-"));
        try {
            const nodeDir = path.join(tempDir, "a", "b");
            await treeNodeWrite(nodeDir, { title: "Auth", slug: "auth", status: "unexpanded" });

            const raw = await readFile(path.join(nodeDir, "node.json"), "utf-8");
            expect(JSON.parse(raw)).toEqual({ title: "Auth", slug: "auth", status: "unexpanded" });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("overwrites existing file content", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-node-write-"));
        try {
            const nodeDir = path.join(tempDir, "node");
            await treeNodeWrite(nodeDir, { title: "Old", slug: "old", status: "unexpanded" });
            await writeFile(path.join(nodeDir, "node.json"), "{}\n", "utf-8");

            await treeNodeWrite(nodeDir, { title: "New", slug: "new", sessionId: "sess-2", status: "expanded" });
            const raw = await readFile(path.join(nodeDir, "node.json"), "utf-8");
            expect(JSON.parse(raw)).toEqual({ title: "New", slug: "new", sessionId: "sess-2", status: "expanded" });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
