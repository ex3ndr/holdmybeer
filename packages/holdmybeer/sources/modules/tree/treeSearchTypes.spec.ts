import { describe, expect, it } from "vitest";
import type { TreeChildEntry, TreeNode, TreeNodeDisk, TreeSearchConfig, TreeSearchResult } from "@/types";

describe("treeSearchTypes", () => {
    it("exposes cross-cutting tree types from @/types", () => {
        const child: TreeChildEntry = {
            title: "Auth",
            slug: "auth"
        };
        const node: TreeNode = {
            slug: "auth",
            title: "Auth",
            depth: 1,
            dirPath: "/tmp/tree/auth",
            parentDirPath: "/tmp/tree",
            status: "unexpanded",
            children: []
        };
        const nodeDisk: TreeNodeDisk = {
            title: "Auth",
            slug: "auth",
            status: "unexpanded"
        };
        const config: TreeSearchConfig = {
            rootDir: "/tmp/tree",
            rootPrompt: "Create top-level research topics.",
            documentPrompt: (entry) => `Document: ${entry.title}`,
            childrenPrompt: (entry) => `Children: ${entry.title}`
        };
        const result: TreeSearchResult = {
            totalExpanded: 1,
            totalLeaves: 0,
            totalSkipped: 0
        };

        expect(child.slug).toBe("auth");
        expect(node.status).toBe("unexpanded");
        expect(nodeDisk.slug).toBe("auth");
        expect(config.rootDir).toBe("/tmp/tree");
        expect(result.totalExpanded).toBe(1);
    });
});
