import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { text } from "@text";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, TreeNode } from "@/types";

const generateTextMock = vi.hoisted(() => vi.fn());
const treeNodeExpandMock = vi.hoisted(() => vi.fn());
const treeLeafPickMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateText.js", () => ({
    generateText: generateTextMock
}));

vi.mock("@/modules/tree/treeNodeExpand.js", () => ({
    treeNodeExpand: treeNodeExpandMock
}));

vi.mock("@/modules/tree/treeLeafPick.js", () => ({
    treeLeafPick: treeLeafPickMock
}));

import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import { treeSearchRun } from "@/modules/tree/treeSearchRun.js";

describe("treeSearchRun", () => {
    beforeEach(() => {
        generateTextMock.mockReset();
        treeNodeExpandMock.mockReset();
        treeLeafPickMock.mockReset();
    });

    it("phase 1 expands all root children with concurrency limit", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-run-"));
        try {
            generateTextMock.mockResolvedValue({
                provider: "pi",
                text: JSON.stringify([
                    { title: "Auth", slug: "auth" },
                    { title: "Database", slug: "database" }
                ])
            });

            let active = 0;
            let peak = 0;
            treeNodeExpandMock.mockImplementation(async () => {
                active += 1;
                peak = Math.max(peak, active);
                await new Promise((resolve) => setTimeout(resolve, 15));
                active -= 1;
                return { children: [], status: "leaf", skipped: false };
            });
            treeLeafPickMock.mockResolvedValue(null);

            const context = treeSearchRunContext(tempDir);
            const result = await treeSearchRun(context, {
                rootDir: path.join(tempDir, "tree"),
                rootPrompt: "root children",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children",
                concurrency: 2,
                maxDepth: 4
            });

            expect(treeNodeExpandMock).toHaveBeenCalledTimes(2);
            expect(peak).toBeLessThanOrEqual(2);
            expect(result.totalExpanded).toBe(2);

            const rootChildren = JSON.parse(
                await readFile(path.join(tempDir, "tree", "children.json"), "utf-8")
            ) as Array<{ title: string; slug: string }>;
            expect(rootChildren).toEqual([
                { title: "Auth", slug: "auth" },
                { title: "Database", slug: "database" }
            ]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("phase 2 dispatches picker-selected leaves and respects concurrency", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-run-"));
        try {
            generateTextMock.mockResolvedValue({
                provider: "pi",
                text: JSON.stringify([{ title: "Auth", slug: "auth" }])
            });

            const rootDir = path.join(tempDir, "tree");
            const leafA = treeSearchRunNode(
                path.join(rootDir, "auth", "oauth2"),
                path.join(rootDir, "auth"),
                "oauth2",
                2
            );
            const leafB = treeSearchRunNode(
                path.join(rootDir, "auth", "sessions"),
                path.join(rootDir, "auth"),
                "sessions",
                2
            );

            treeLeafPickMock
                .mockResolvedValueOnce(leafA)
                .mockResolvedValueOnce(leafB)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            let active = 0;
            let peak = 0;
            treeNodeExpandMock.mockImplementation(async (_ctx: Context, node: TreeNode) => {
                active += 1;
                peak = Math.max(peak, active);
                await new Promise((resolve) => setTimeout(resolve, 15));
                active -= 1;
                return { children: [], status: "leaf", skipped: node.depth === 1 };
            });

            const context = treeSearchRunContext(tempDir);
            const result = await treeSearchRun(context, {
                rootDir,
                rootPrompt: "root children",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children",
                concurrency: 2,
                maxDepth: 4
            });

            expect(peak).toBeLessThanOrEqual(2);
            expect(treeLeafPickMock).toHaveBeenCalled();
            expect(result.totalExpanded).toBe(2);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("marks nodes as leaf when max depth is reached", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-run-"));
        try {
            generateTextMock.mockResolvedValue({
                provider: "pi",
                text: JSON.stringify([{ title: "Auth", slug: "auth" }])
            });
            treeLeafPickMock.mockResolvedValue(null);
            treeNodeExpandMock.mockResolvedValue({ children: [], status: "leaf", skipped: false });

            const context = treeSearchRunContext(tempDir);
            const rootDir = path.join(tempDir, "tree");
            await treeSearchRun(context, {
                rootDir,
                rootPrompt: "root children",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children",
                maxDepth: 1
            });

            const node = await treeNodeRead(path.join(rootDir, "auth"));
            expect(treeNodeExpandMock).not.toHaveBeenCalled();
            expect(node?.status).toBe("leaf");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("counts skipped expansions for resumable nodes", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-run-"));
        try {
            generateTextMock.mockResolvedValue({
                provider: "pi",
                text: JSON.stringify([{ title: "Auth", slug: "auth" }])
            });
            treeNodeExpandMock.mockResolvedValue({ children: [], status: "leaf", skipped: true });
            treeLeafPickMock.mockResolvedValue(null);

            const context = treeSearchRunContext(tempDir);
            const result = await treeSearchRun(context, {
                rootDir: path.join(tempDir, "tree"),
                rootPrompt: "root children",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children"
            });

            expect(result.totalSkipped).toBe(1);
            expect(result.totalExpanded).toBe(0);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("reports picker unresolved status when leaves remain but picker returns null", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-run-"));
        try {
            generateTextMock.mockResolvedValue({
                provider: "pi",
                text: JSON.stringify([{ title: "Auth", slug: "auth" }])
            });
            treeNodeExpandMock.mockResolvedValue({ children: [], status: "leaf", skipped: true });
            treeLeafPickMock.mockResolvedValue(null);
            const progressMessages: string[] = [];

            const context = treeSearchRunContext(tempDir, progressMessages);
            await treeSearchRun(context, {
                rootDir: path.join(tempDir, "tree"),
                rootPrompt: "root children",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children"
            });

            expect(progressMessages).toContain(text.tree_search_picker_unresolved);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

function treeSearchRunNode(dirPath: string, parentDirPath: string, slug: string, depth: number): TreeNode {
    return {
        slug,
        title: slug,
        depth,
        dirPath,
        parentDirPath,
        status: "unexpanded",
        children: []
    };
}

function treeSearchRunContext(projectPath: string, progressMessages?: string[]): Context {
    return {
        projectPath,
        providers: [],
        progress: async <T>(
            initialMessage: string,
            operation: (report: (message: string) => void) => Promise<T>
        ): Promise<T> => {
            progressMessages?.push(initialMessage);
            return operation(() => {});
        }
    } as unknown as Context;
}
