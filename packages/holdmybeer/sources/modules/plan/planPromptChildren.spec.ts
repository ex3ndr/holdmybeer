import { describe, expect, it } from "vitest";
import { planPromptChildren } from "@/modules/plan/planPromptChildren.js";
import type { TreeNode } from "@/types";

describe("planPromptChildren", () => {
    it("requires json-only child output contract", () => {
        const node: TreeNode = {
            title: "API Layer",
            slug: "api-layer",
            depth: 2,
            dirPath: "/tmp/tree/api-layer",
            parentDirPath: "/tmp/tree",
            status: "unexpanded",
            children: []
        };

        const prompt = planPromptChildren(node, [
            {
                label: "Blueprint",
                relativePath: "doc/project-blueprint.md",
                absolutePath: "/tmp/project/doc/project-blueprint.md"
            }
        ]);

        expect(prompt).toContain("return []");
        expect(prompt).toContain("Return ONLY a JSON array");
    });
});
