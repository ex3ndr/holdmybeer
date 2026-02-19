import path from "node:path";
import { text } from "@text";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generateFile.js", () => ({
    generateFile: generateFileMock
}));

import { generateReadme } from "./generateReadme.js";

const input = {
    sourceFullName: "owner/source",
    publishFullName: "owner/publish",
    originalCheckoutPath: "/tmp/source"
};

describe("generateReadme", () => {
    beforeEach(() => {
        generateFileMock.mockReset();
    });

    it("generates README.md in project root with file expected output mode", async () => {
        const context = { projectPath: "/tmp/project" } as Context;
        generateFileMock.mockResolvedValue({ provider: "pi", sessionId: "session-1", text: "ok" });

        const result = await generateReadme(context, input);

        expect(generateFileMock).toHaveBeenCalledTimes(1);
        const [calledContext, prompt, outputPath, permissions] = generateFileMock.mock.calls[0]!;
        expect(calledContext).toBe(context);
        expect(prompt).toContain("owner/source");
        expect(prompt).toContain("owner/publish");
        expect(outputPath).toBe(path.resolve("/tmp/project", "README.md"));
        expect(permissions).toEqual(
            expect.objectContaining({
                showProgress: false,
                modelSelectionMode: "sonnet"
            })
        );
        expect(permissions).not.toHaveProperty("verify");

        expect(result).toEqual({
            provider: "pi",
            sessionId: "session-1",
            text: "ok",
            readmePath: path.resolve("/tmp/project", "README.md")
        });
    });

    it("uses workflow progress wrapper when requested", async () => {
        const progress = vi.fn(async (_message: string, operation: () => Promise<unknown>) => operation());
        const context = {
            projectPath: "/tmp/project",
            progress
        } as unknown as Context;
        generateFileMock.mockResolvedValue({ provider: "pi", text: "ok" });

        await generateReadme(context, input, { showProgress: true });

        expect(progress).toHaveBeenCalledWith(text.bootstrap_readme_generating, expect.any(Function));
    });
});
