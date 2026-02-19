import { describe, expect, it } from "vitest";
import { treeStateLeaves } from "@/modules/tree/treeStateLeaves.js";
import type { TreeNode } from "@/types";

describe("treeStateLeaves", () => {
    it("returns unexpanded nodes with expanded parents only", () => {
        const tree: TreeNode[] = [
            {
                slug: "auth",
                title: "Auth",
                depth: 1,
                dirPath: "/tmp/auth",
                parentDirPath: "/tmp",
                status: "expanded",
                children: [
                    {
                        slug: "oauth2",
                        title: "OAuth2",
                        depth: 2,
                        dirPath: "/tmp/auth/oauth2",
                        parentDirPath: "/tmp/auth",
                        status: "unexpanded",
                        children: []
                    },
                    {
                        slug: "sessions",
                        title: "Sessions",
                        depth: 2,
                        dirPath: "/tmp/auth/sessions",
                        parentDirPath: "/tmp/auth",
                        status: "in-progress",
                        children: []
                    }
                ]
            },
            {
                slug: "database",
                title: "Database",
                depth: 1,
                dirPath: "/tmp/database",
                parentDirPath: "/tmp",
                status: "unexpanded",
                children: [
                    {
                        slug: "queries",
                        title: "Queries",
                        depth: 2,
                        dirPath: "/tmp/database/queries",
                        parentDirPath: "/tmp/database",
                        status: "unexpanded",
                        children: []
                    }
                ]
            }
        ];

        expect(treeStateLeaves(tree).map((entry) => entry.slug)).toEqual(["oauth2", "database"]);
    });
});
