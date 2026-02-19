import { describe, expect, it } from "vitest";
import { planPromptDocument } from "@/modules/plan/planPromptDocument.js";
import type { TreeNode } from "@/types";

describe("planPromptDocument", () => {
    it("contains frontmatter and section requirements for the node", () => {
        const node: TreeNode = {
            title: "API Layer",
            slug: "api-layer",
            depth: 2,
            dirPath: "/tmp/tree/api-layer",
            parentDirPath: "/tmp/tree",
            status: "unexpanded",
            children: []
        };

        const prompt = planPromptDocument(node, [
            {
                label: "Blueprint",
                relativePath: "doc/project-blueprint.md",
                absolutePath: "/tmp/project/doc/project-blueprint.md"
            }
        ]);

        expect(prompt).toContain("title: API Layer");
        expect(prompt).toContain("slug: api-layer");
        expect(prompt).toContain("Concrete Tasks");
    });
});
