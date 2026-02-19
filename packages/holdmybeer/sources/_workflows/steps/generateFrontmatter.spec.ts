import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Context } from "@/types";

const generateFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateFile.js", () => ({
    generateFile: generateFileMock
}));

import { generateFrontmatter } from "./generateFrontmatter.js";

describe("generateFrontmatter", () => {
    beforeEach(() => {
        generateFileMock.mockReset();
    });

    it("generates a file with frontmatter schema verification", async () => {
        const context = { projectPath: "/tmp/project" } as Context;
        const schema = z.object({
            title: z.string(),
            tags: z.array(z.string())
        });
        generateFileMock.mockResolvedValue({ provider: "pi", sessionId: "session-1", text: "ok" });

        const result = await generateFrontmatter(context, "Generate page", "docs/page.md", schema, {
            retries: 2
        });

        expect(generateFileMock).toHaveBeenCalledTimes(1);
        const [calledContext, prompt, outputPath, permissions] = generateFileMock.mock.calls[0]!;
        expect(calledContext).toBe(context);
        expect(prompt).toBe("Generate page");
        expect(outputPath).toBe(path.resolve("/tmp/project", "docs/page.md"));
        expect(permissions).toEqual(
            expect.objectContaining({
                retries: 2,
                verify: expect.any(Function)
            })
        );

        const verify = permissions.verify as (output: {
            text: string;
            filePath: string;
            fileContent: string;
        }) => void | Promise<void>;

        await expect(
            Promise.resolve(
                verify({
                    text: "ok",
                    filePath: path.resolve("/tmp/project", "docs/page.md"),
                    fileContent: "---\ntitle: Intro\ntags:\n  - docs\n---\n# Intro\n"
                })
            )
        ).resolves.toBeUndefined();

        expect(result).toEqual({
            provider: "pi",
            sessionId: "session-1",
            text: "ok",
            filePath: path.resolve("/tmp/project", "docs/page.md")
        });
    });

    it("rejects files without frontmatter", async () => {
        const context = { projectPath: "/tmp/project" } as Context;
        const schema = z.object({ title: z.string() });
        generateFileMock.mockResolvedValue({ text: "ok" });

        await generateFrontmatter(context, "Generate page", "docs/page.md", schema);
        const [, , , permissions] = generateFileMock.mock.calls[0]!;
        const verify = permissions.verify as (output: {
            text: string;
            filePath: string;
            fileContent: string;
        }) => void | Promise<void>;

        expect(() =>
            verify({
                text: "ok",
                filePath: path.resolve("/tmp/project", "docs/page.md"),
                fileContent: "# Intro\n"
            })
        ).toThrow("Generated file must include frontmatter");
    });

    it("rejects frontmatter that does not match schema", async () => {
        const context = { projectPath: "/tmp/project" } as Context;
        const schema = z.object({ title: z.string() });
        generateFileMock.mockResolvedValue({ text: "ok" });

        await generateFrontmatter(context, "Generate page", "docs/page.md", schema);
        const [, , , permissions] = generateFileMock.mock.calls[0]!;
        const verify = permissions.verify as (output: {
            text: string;
            filePath: string;
            fileContent: string;
        }) => void | Promise<void>;

        expect(() =>
            verify({
                text: "ok",
                filePath: path.resolve("/tmp/project", "docs/page.md"),
                fileContent: "---\nslug: intro\n---\n# Intro\n"
            })
        ).toThrow("Generated frontmatter does not match schema");
    });
});
