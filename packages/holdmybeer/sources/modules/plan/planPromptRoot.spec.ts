import { describe, expect, it } from "vitest";
import { planPromptRoot } from "@/modules/plan/planPromptRoot.js";

describe("planPromptRoot", () => {
    it("embeds source document paths and output contract", () => {
        const prompt = planPromptRoot([
            {
                label: "Blueprint",
                relativePath: "doc/project-blueprint.md",
                absolutePath: "/tmp/project/doc/project-blueprint.md"
            }
        ]);

        expect(prompt).toContain("/tmp/project/doc/project-blueprint.md");
        expect(prompt).toContain("Return ONLY a JSON array");
    });
});
