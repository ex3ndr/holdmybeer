import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, TreeNode } from "@/types";

const generateTextMock = vi.hoisted(() => vi.fn());
const treeStateReadMock = vi.hoisted(() => vi.fn());
const treeStateRenderMock = vi.hoisted(() => vi.fn());
const treeStateLeavesMock = vi.hoisted(() => vi.fn());
const treeNodeReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateText.js", () => ({
    generateText: generateTextMock
}));

vi.mock("@/modules/tree/treeStateRead.js", () => ({
    treeStateRead: treeStateReadMock
}));

vi.mock("@/modules/tree/treeStateRender.js", () => ({
    treeStateRender: treeStateRenderMock
}));

vi.mock("@/modules/tree/treeStateLeaves.js", () => ({
    treeStateLeaves: treeStateLeavesMock
}));

vi.mock("@/modules/tree/treeNodeRead.js", () => ({
    treeNodeRead: treeNodeReadMock
}));

import { treeLeafPick } from "@/modules/tree/treeLeafPick.js";

describe("treeLeafPick", () => {
    beforeEach(() => {
        generateTextMock.mockReset();
        treeStateReadMock.mockReset();
        treeStateRenderMock.mockReset();
        treeStateLeavesMock.mockReset();
        treeNodeReadMock.mockReset();
    });

    it("returns null when no unexpanded leaves remain", async () => {
        treeStateReadMock.mockResolvedValue([]);
        treeStateLeavesMock.mockReturnValue([]);

        const context = treeLeafPickContext();
        const result = await treeLeafPick(context, {
            rootDir: "/tmp/tree",
            rootPrompt: "root",
            documentPrompt: () => "doc",
            childrenPrompt: () => "children"
        });

        expect(result).toBeNull();
        expect(generateTextMock).not.toHaveBeenCalled();
    });

    it("uses tree outline prompt and returns selected leaf", async () => {
        const leafA = treeLeafPickNode("/tmp/tree/auth/oauth2", "/tmp/tree/auth", "oauth2", "OAuth2");
        const leafB = treeLeafPickNode("/tmp/tree/db/migrations", "/tmp/tree/db", "migrations", "Migrations");
        treeStateReadMock.mockResolvedValue([leafA, leafB]);
        treeStateRenderMock.mockReturnValue("- Auth [expanded]");
        treeStateLeavesMock.mockReturnValue([leafA, leafB]);
        generateTextMock.mockResolvedValue({ provider: "pi", text: "auth/oauth2" });
        treeNodeReadMock.mockResolvedValue({ title: "OAuth2", slug: "oauth2", status: "unexpanded" });

        const context = treeLeafPickContext();
        const result = await treeLeafPick(context, {
            rootDir: "/tmp/tree",
            rootPrompt: "root",
            documentPrompt: () => "doc",
            childrenPrompt: () => "children",
            modelSelectionMode: "codex-xhigh"
        });

        expect(result).toBe(leafA);
        expect(generateTextMock).toHaveBeenCalledWith(
            context,
            expect.stringContaining("- Auth [expanded]"),
            expect.objectContaining({ modelSelectionMode: "codex-xhigh" })
        );
    });

    it("retries when picker returns a node already marked in-progress", async () => {
        const leaf = treeLeafPickNode("/tmp/tree/auth/oauth2", "/tmp/tree/auth", "oauth2", "OAuth2");
        treeStateReadMock.mockResolvedValue([leaf]);
        treeStateRenderMock.mockReturnValue("- Auth [expanded]");
        treeStateLeavesMock.mockReturnValue([leaf]);
        generateTextMock
            .mockResolvedValueOnce({ provider: "pi", text: "auth/oauth2" })
            .mockResolvedValueOnce({ provider: "pi", text: "auth/oauth2" });
        treeNodeReadMock
            .mockResolvedValueOnce({ title: "OAuth2", slug: "oauth2", status: "in-progress" })
            .mockResolvedValueOnce({ title: "OAuth2", slug: "oauth2", status: "unexpanded" });

        const context = treeLeafPickContext();
        const result = await treeLeafPick(context, {
            rootDir: "/tmp/tree",
            rootPrompt: "root",
            documentPrompt: () => "doc",
            childrenPrompt: () => "children"
        });

        expect(result).toBe(leaf);
        expect(generateTextMock).toHaveBeenCalledTimes(2);
    });

    it("returns null when picker keeps returning invalid paths", async () => {
        const leaf = treeLeafPickNode("/tmp/tree/auth/oauth2", "/tmp/tree/auth", "oauth2", "OAuth2");
        treeStateReadMock.mockResolvedValue([leaf]);
        treeStateRenderMock.mockReturnValue("- Auth [expanded]");
        treeStateLeavesMock.mockReturnValue([leaf]);
        generateTextMock.mockResolvedValue({ provider: "pi", text: "not-a-real-path" });

        const context = treeLeafPickContext();
        const result = await treeLeafPick(context, {
            rootDir: "/tmp/tree",
            rootPrompt: "root",
            documentPrompt: () => "doc",
            childrenPrompt: () => "children"
        });

        expect(result).toBeNull();
        expect(generateTextMock).toHaveBeenCalledTimes(5);
    });
});

function treeLeafPickNode(dirPath: string, parentDirPath: string, slug: string, title: string): TreeNode {
    return {
        slug,
        title,
        depth: 2,
        dirPath,
        parentDirPath,
        status: "unexpanded",
        children: []
    };
}

function treeLeafPickContext(): Context {
    return {
        projectPath: "/tmp/project",
        providers: [],
        progress: async <T>(
            _initialMessage: string,
            operation: (report: (message: string) => void) => Promise<T>
        ): Promise<T> => operation(() => {})
    } as unknown as Context;
}
