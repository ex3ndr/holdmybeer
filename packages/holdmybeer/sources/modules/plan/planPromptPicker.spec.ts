import { describe, expect, it } from "vitest";
import { planPromptPicker } from "@/modules/plan/planPromptPicker.js";
import type { TreeNode } from "@/types";

describe("planPromptPicker", () => {
    it("renders candidate leaf paths and output requirement", () => {
        const leaves: TreeNode[] = [
            {
                title: "API Contracts",
                slug: "api-contracts",
                depth: 2,
                dirPath: "/tmp/tree/backend/api-contracts",
                parentDirPath: "/tmp/tree/backend",
                status: "unexpanded",
                children: []
            }
        ];

        const prompt = planPromptPicker("/tmp/tree", "- Backend [expanded]", leaves);
        expect(prompt).toContain("backend/api-contracts");
        expect(prompt).toContain("<output>");
    });
});
