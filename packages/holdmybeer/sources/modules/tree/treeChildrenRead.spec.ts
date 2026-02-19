import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { treeChildrenRead } from "@/modules/tree/treeChildrenRead.js";

describe("treeChildrenRead", () => {
    it("returns null when children.json is missing", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-children-read-"));
        try {
            await expect(treeChildrenRead(tempDir)).resolves.toBeNull();
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("reads parsed children entries", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-children-read-"));
        try {
            await writeFile(
                path.join(tempDir, "children.json"),
                JSON.stringify(
                    [
                        { title: "OAuth2", slug: "oauth2" },
                        { title: "Sessions", slug: "sessions" }
                    ],
                    null,
                    2
                ),
                "utf-8"
            );

            await expect(treeChildrenRead(tempDir)).resolves.toEqual([
                { title: "OAuth2", slug: "oauth2" },
                { title: "Sessions", slug: "sessions" }
            ]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("throws on malformed JSON", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-children-read-"));
        try {
            await writeFile(path.join(tempDir, "children.json"), "{bad", "utf-8");
            await expect(treeChildrenRead(tempDir)).rejects.toThrow("Invalid JSON");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
