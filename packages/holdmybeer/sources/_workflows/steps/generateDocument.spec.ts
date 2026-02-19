import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateFile.js", () => ({
    generateFile: generateFileMock
}));

import { generateDocument } from "./generateDocument.js";

describe("generateDocument", () => {
    beforeEach(() => {
        generateFileMock.mockReset();
    });

    it("runs PROMPT_RESEARCH with resolved output path and selected model mode", async () => {
        const progress = vi.fn(async (_message: string, operation: () => Promise<unknown>) => operation());
        const context = { projectPath: "/tmp/project", progress } as unknown as Context;
        generateFileMock.mockResolvedValue({ provider: "pi", sessionId: "session-1", text: "ok" });

        const result = await generateDocument(context, {
            promptId: "PROMPT_RESEARCH",
            outputPath: "doc/research.md",
            modelSelectionMode: "opus"
        });

        expect(progress).toHaveBeenCalledWith(
            "Generating research document (starting, tokens 0)",
            expect.any(Function)
        );
        expect(generateFileMock).toHaveBeenCalledTimes(1);
        const [calledContext, prompt, outputPath, permissions] = generateFileMock.mock.calls[0]!;
        expect(calledContext).toBe(context);
        expect(prompt).toContain("You are a senior software analyst");
        expect(outputPath).toBe(path.resolve("/tmp/project", "doc/research.md"));
        expect(permissions).toEqual(
            expect.objectContaining({
                showProgress: false,
                modelSelectionMode: "opus"
            })
        );
        expect(result).toEqual({
            provider: "pi",
            sessionId: "session-1",
            text: "ok",
            outputPath: path.resolve("/tmp/project", "doc/research.md")
        });
    });

    it("skips context progress wrapper when showProgress is false", async () => {
        const progress = vi.fn(async (_message: string, operation: () => Promise<unknown>) => operation());
        const context = {
            projectPath: "/tmp/project",
            progress
        } as unknown as Context;
        generateFileMock.mockResolvedValue({ provider: "pi", text: "ok" });

        await generateDocument(
            context,
            {
                promptId: "PROMPT_RESEARCH_PROBLEMS",
                outputPath: "doc/research-problems.md",
                modelSelectionMode: "codex-xhigh"
            },
            {
                showProgress: false,
                progressMessage: "Research progress"
            }
        );

        expect(progress).not.toHaveBeenCalled();
    });
});
