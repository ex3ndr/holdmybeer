import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { planSourceDocumentsResolve } from "@/modules/plan/planSourceDocumentsResolve.js";

describe("planSourceDocumentsResolve", () => {
    it("returns only known planning documents that exist", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-plan-sources-"));
        try {
            await mkdir(path.join(tempDir, "doc"), { recursive: true });
            await writeFile(path.join(tempDir, "doc", "project-blueprint.md"), "# blueprint\n", "utf-8");
            await writeFile(path.join(tempDir, "README.md"), "# readme\n", "utf-8");

            const sources = await planSourceDocumentsResolve(tempDir);
            expect(sources.map((entry) => entry.relativePath)).toEqual(["doc/project-blueprint.md", "README.md"]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
