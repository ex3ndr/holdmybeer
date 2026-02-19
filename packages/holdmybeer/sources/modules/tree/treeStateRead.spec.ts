import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { treeStateRead } from "@/modules/tree/treeStateRead.js";

describe("treeStateRead", () => {
    it("returns empty state when root children.json is missing", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-state-read-"));
        try {
            await expect(treeStateRead(tempDir)).resolves.toEqual([]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("reads nested tree state recursively", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-state-read-"));
        try {
            await writeFile(
                path.join(tempDir, "children.json"),
                JSON.stringify([{ title: "Auth", slug: "auth" }], null, 2),
                "utf-8"
            );
            await mkdir(path.join(tempDir, "auth"), { recursive: true });
            await writeFile(
                path.join(tempDir, "auth", "node.json"),
                JSON.stringify({ title: "Auth", slug: "auth", sessionId: "sess-auth", status: "expanded" }, null, 2),
                "utf-8"
            );
            await writeFile(
                path.join(tempDir, "auth", "children.json"),
                JSON.stringify([{ title: "OAuth2", slug: "oauth2" }], null, 2),
                "utf-8"
            );
            await mkdir(path.join(tempDir, "auth", "oauth2"), { recursive: true });
            await writeFile(
                path.join(tempDir, "auth", "oauth2", "node.json"),
                JSON.stringify({ title: "OAuth2", slug: "oauth2", status: "unexpanded" }, null, 2),
                "utf-8"
            );

            const state = await treeStateRead(tempDir);
            expect(state).toHaveLength(1);
            expect(state[0]).toMatchObject({
                title: "Auth",
                slug: "auth",
                depth: 1,
                status: "expanded",
                sessionId: "sess-auth"
            });
            expect(state[0]?.children[0]).toMatchObject({
                title: "OAuth2",
                slug: "oauth2",
                depth: 2,
                status: "unexpanded"
            });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("handles missing node files by falling back to root children entry", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-state-read-"));
        try {
            await writeFile(
                path.join(tempDir, "children.json"),
                JSON.stringify([{ title: "Auth", slug: "auth" }], null, 2),
                "utf-8"
            );

            const state = await treeStateRead(tempDir);
            expect(state).toEqual([
                expect.objectContaining({
                    title: "Auth",
                    slug: "auth",
                    status: "unexpanded",
                    children: []
                })
            ]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
