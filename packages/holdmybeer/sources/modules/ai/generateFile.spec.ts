import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("./generate.js", () => ({
    generate: generateMock
}));

import { generateFile } from "@/modules/ai/generateFile.js";

describe("generateFile", () => {
    beforeEach(() => {
        generateMock.mockReset();
    });

    it("retries when file is missing and succeeds after file appears", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-generate-file-"));
        try {
            const outputPath = path.join(tempDir, "README.md");
            const context = { projectPath: tempDir } as Context;

            generateMock.mockResolvedValueOnce({ provider: "pi", text: "first" }).mockImplementationOnce(async () => {
                await writeFile(outputPath, "# ok\n", "utf-8");
                return { provider: "pi", text: "second" };
            });

            const result = await generateFile(context, "Create readme", outputPath);

            expect(result).toEqual({ provider: "pi", text: "second" });
            expect(generateMock).toHaveBeenCalledTimes(2);
            expect(generateMock.mock.calls[0]?.[2]).toEqual({
                expectedOutput: {
                    type: "file",
                    filePath: outputPath
                },
                writePolicy: {
                    mode: "write-whitelist",
                    writablePaths: [outputPath]
                }
            });
            expect(generateMock.mock.calls[0]?.[1]).toContain(
                `Write the final result only to this file: ${outputPath}.`
            );
            expect(generateMock.mock.calls[0]?.[1]).toContain("Do not write to any other files.");
            expect(generateMock.mock.calls[1]?.[1]).toContain(
                `Last time file did not appear at ${outputPath} - create it now.`
            );
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("throws when file still does not exist after retries", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-generate-file-"));
        try {
            const outputPath = path.join(tempDir, "README.md");
            const context = { projectPath: tempDir } as Context;

            generateMock.mockResolvedValue({ provider: "pi", text: "done" });

            await expect(generateFile(context, "Create readme", outputPath, { retries: 1 })).rejects.toThrow(
                `Inference did not create expected file: ${outputPath}`
            );
            expect(generateMock).toHaveBeenCalledTimes(2);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
