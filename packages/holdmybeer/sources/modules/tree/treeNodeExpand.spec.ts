import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, TreeNode } from "@/types";

const generateSessionCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateSessionCreate.js", () => ({
    generateSessionCreate: generateSessionCreateMock
}));

import { treeNodeExpand } from "@/modules/tree/treeNodeExpand.js";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import { treeNodeWrite } from "@/modules/tree/treeNodeWrite.js";

describe("treeNodeExpand", () => {
    beforeEach(() => {
        generateSessionCreateMock.mockReset();
    });

    it("runs document + children generation in one forked session and persists files", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-expand-"));
        try {
            const rootDir = path.join(tempDir, "tree");
            const parentDir = path.join(rootDir, "auth");
            const nodeDir = path.join(parentDir, "oauth2");

            await treeNodeWrite(parentDir, {
                title: "Authentication",
                slug: "auth",
                sessionId: "sess-parent",
                status: "expanded"
            });
            await treeNodeWrite(nodeDir, {
                title: "OAuth2 Flow",
                slug: "oauth2",
                status: "unexpanded"
            });

            const generateMock = vi
                .fn()
                .mockImplementationOnce(async (_prompt: string, permissions: Record<string, unknown>) => {
                    const expectedOutput = permissions.expectedOutput as {
                        type: "file";
                        filePath: string;
                        verify?: (input: { text: string; filePath: string; fileContent: string }) => void;
                    };
                    await writeFile(expectedOutput.filePath, "---\ntitle: OAuth2\n---\n\nBody\n", "utf-8");
                    expectedOutput.verify?.({
                        text: "ok",
                        filePath: expectedOutput.filePath,
                        fileContent: "---\ntitle: OAuth2\n---\n\nBody\n"
                    });
                    return { provider: "pi", sessionId: "sess-child", text: "wrote doc" };
                })
                .mockImplementationOnce(async () => {
                    return {
                        provider: "pi",
                        sessionId: "sess-child",
                        text: JSON.stringify([{ title: "Token Refresh", slug: "token-refresh" }])
                    };
                });

            generateSessionCreateMock.mockReturnValue({
                sessionId: "sess-child",
                generate: generateMock
            });

            const context = treeNodeExpandContext(tempDir);
            const node: TreeNode = {
                title: "OAuth2 Flow",
                slug: "oauth2",
                depth: 2,
                dirPath: nodeDir,
                parentDirPath: parentDir,
                status: "unexpanded",
                children: []
            };

            const result = await treeNodeExpand(context, node, {
                rootDir,
                rootPrompt: "unused",
                documentPrompt: (entry) => `Document ${entry.title}`,
                childrenPrompt: (entry) => `Children ${entry.title}`,
                modelSelectionMode: "codex-high"
            });

            expect(generateSessionCreateMock).toHaveBeenCalledWith(context, { sessionId: "sess-parent" });
            expect(generateMock).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                children: [{ title: "Token Refresh", slug: "token-refresh" }],
                status: "expanded",
                skipped: false
            });

            const childrenRaw = await readFile(path.join(nodeDir, "children.json"), "utf-8");
            expect(JSON.parse(childrenRaw)).toEqual([{ title: "Token Refresh", slug: "token-refresh" }]);
            await expect(treeNodeRead(nodeDir)).resolves.toEqual({
                title: "OAuth2 Flow",
                slug: "oauth2",
                sessionId: "sess-child",
                status: "expanded"
            });
            await expect(treeNodeRead(path.join(nodeDir, "token-refresh"))).resolves.toEqual({
                title: "Token Refresh",
                slug: "token-refresh",
                status: "unexpanded"
            });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("skips inference when node is already expanded with persisted document and children", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-tree-expand-"));
        try {
            const rootDir = path.join(tempDir, "tree");
            const nodeDir = path.join(rootDir, "auth");
            await treeNodeWrite(nodeDir, {
                title: "Authentication",
                slug: "auth",
                sessionId: "sess-auth",
                status: "expanded"
            });
            await writeFile(path.join(nodeDir, "document.md"), "---\ntitle: Auth\n---\n", "utf-8");
            await writeFile(path.join(nodeDir, "children.json"), "[]\n", "utf-8");

            const context = treeNodeExpandContext(tempDir);
            const node: TreeNode = {
                title: "Authentication",
                slug: "auth",
                depth: 1,
                dirPath: nodeDir,
                parentDirPath: rootDir,
                status: "expanded",
                children: []
            };

            const result = await treeNodeExpand(context, node, {
                rootDir,
                rootPrompt: "unused",
                documentPrompt: () => "doc",
                childrenPrompt: () => "children"
            });

            expect(result).toEqual({
                children: [],
                status: "leaf",
                skipped: true
            });
            expect(generateSessionCreateMock).not.toHaveBeenCalled();
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

function treeNodeExpandContext(projectPath: string): Context {
    return {
        projectPath,
        providers: [],
        progress: async <T>(
            _initialMessage: string,
            operation: (report: (message: string) => void) => Promise<T>
        ): Promise<T> => operation(() => {})
    } as unknown as Context;
}
