import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const providerGenerateMock = vi.hoisted(() => vi.fn());
const sandboxInferenceGetMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/providerGenerate.js", () => ({
    providerGenerate: providerGenerateMock
}));

vi.mock("@/modules/sandbox/sandboxInferenceGet.js", () => ({
    sandboxInferenceGet: sandboxInferenceGetMock
}));

import { generate } from "@/modules/ai/generate.js";

describe("generate expectedOutput verification", () => {
    beforeEach(() => {
        providerGenerateMock.mockReset();
        sandboxInferenceGetMock.mockReset();
        sandboxInferenceGetMock.mockResolvedValue({
            wrapCommand: async (command: string) => command
        });
    });

    it("passes generated text to text verify callback", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            await input.validateOutput?.("validated text");
            return {
                output: "validated text"
            };
        });

        const verify = vi.fn();
        const context = {
            projectPath: "/tmp/test-project",
            providers: [{ id: "pi", available: true, command: "pi", priority: 1 }]
        } as unknown as Context;

        const result = await generate(context, "hello", {
            expectedOutput: {
                type: "text",
                verify
            }
        });

        expect(result).toEqual({
            provider: "pi",
            text: "validated text"
        });
        expect(verify).toHaveBeenCalledWith({ text: "validated text" });
    });

    it("passes model text and file content to file verify callback", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-generate-verify-"));
        try {
            const outputPath = path.join(tempDir, "result.md");
            await writeFile(outputPath, "# generated\n", "utf-8");

            providerGenerateMock.mockImplementation(async (input) => {
                await input.validateOutput?.("file generated");
                return {
                    output: "file generated"
                };
            });

            const verify = vi.fn(async (_output) => {});
            const context = {
                projectPath: tempDir,
                providers: [{ id: "pi", available: true, command: "pi", priority: 1 }]
            } as unknown as Context;

            const result = await generate(context, "write file", {
                expectedOutput: {
                    type: "file",
                    filePath: outputPath,
                    verify
                }
            });

            expect(result).toEqual({
                provider: "pi",
                text: "file generated"
            });
            expect(verify).toHaveBeenCalledWith({
                text: "file generated",
                filePath: outputPath,
                fileContent: "# generated\n"
            });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
