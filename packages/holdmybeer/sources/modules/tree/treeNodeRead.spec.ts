import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";

describe("treeNodeRead", () => {
    it("returns null when node.json is missing", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-node-read-"));
        try {
            await expect(treeNodeRead(tempDir)).resolves.toBeNull();
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("reads parsed node metadata", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-node-read-"));
        try {
            await writeFile(
                path.join(tempDir, "node.json"),
                JSON.stringify({ title: "Auth", slug: "auth", sessionId: "sess-1", status: "expanded" }, null, 2),
                "utf-8"
            );

            await expect(treeNodeRead(tempDir)).resolves.toEqual({
                title: "Auth",
                slug: "auth",
                sessionId: "sess-1",
                status: "expanded"
            });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("throws on malformed JSON", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-node-read-"));
        try {
            await writeFile(path.join(tempDir, "node.json"), "{bad", "utf-8");
            await expect(treeNodeRead(tempDir)).rejects.toThrow("Invalid JSON");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
