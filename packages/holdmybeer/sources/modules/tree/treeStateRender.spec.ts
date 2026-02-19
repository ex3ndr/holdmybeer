import { describe, expect, it } from "vitest";
import { treeStateRender } from "@/modules/tree/treeStateRender.js";
import type { TreeNode } from "@/types";

describe("treeStateRender", () => {
    it("renders indentation and status labels", () => {
        const tree: TreeNode[] = [
            {
                slug: "auth",
                title: "Authentication System",
                depth: 1,
                dirPath: "/tmp/auth",
                parentDirPath: "/tmp",
                status: "expanded",
                children: [
                    {
                        slug: "oauth2",
                        title: "OAuth2 Flow",
                        depth: 2,
                        dirPath: "/tmp/auth/oauth2",
                        parentDirPath: "/tmp/auth",
                        status: "unexpanded",
                        children: []
                    },
                    {
                        slug: "sessions",
                        title: "Session Management",
                        depth: 2,
                        dirPath: "/tmp/auth/sessions",
                        parentDirPath: "/tmp/auth",
                        status: "in-progress",
                        children: []
                    }
                ]
            }
        ];

        expect(treeStateRender(tree)).toBe(
            [
                "- Authentication System [expanded]",
                "  - OAuth2 Flow [unexpanded]",
                "  - Session Management [in-progress]"
            ].join("\n")
        );
    });
});
