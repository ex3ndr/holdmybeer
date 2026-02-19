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
            const context = {
                projectPath: tempDir,
                settings: {
                    version: 1,
                    updatedAt: 1,
                    sourceRepo: {
                        owner: "owner",
                        repo: "source",
                        fullName: "owner/source",
                        url: "https://github.com/owner/source"
                    }
                }
            } as Context;

            generateMock
                .mockResolvedValueOnce({ provider: "pi", sessionId: "session-a", text: "first" })
                .mockImplementationOnce(async () => {
                    await writeFile(outputPath, "# ok\n", "utf-8");
                    return { provider: "pi", sessionId: "session-b", text: "second" };
                });

            const result = await generateFile(
                context,
                "Create readme for {sourceFullName} from {originalCheckoutPath} into {outputPath}",
                outputPath
            );

            expect(result).toEqual({ provider: "pi", sessionId: "session-b", text: "second" });
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
            expect(generateMock.mock.calls[0]?.[1]).toContain("Create readme for owner/source");
            expect(generateMock.mock.calls[0]?.[1]).toContain(path.join(tempDir, ".beer", "local", "original"));
            expect(generateMock.mock.calls[0]?.[1]).toContain(outputPath);
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
            const context = {
                projectPath: tempDir,
                settings: {
                    version: 1,
                    updatedAt: 1
                }
            } as Context;

            generateMock.mockResolvedValue({ provider: "pi", sessionId: "session-c", text: "done" });

            await expect(generateFile(context, "Create readme", outputPath, { retries: 1 })).rejects.toThrow(
                `Inference did not create expected file: ${outputPath}`
            );
            expect(generateMock).toHaveBeenCalledTimes(2);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("forwards verify callback into file expected output", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-generate-file-"));
        try {
            const outputPath = path.join(tempDir, "README.md");
            const verify = vi.fn();
            const context = {
                projectPath: tempDir,
                settings: {
                    version: 1,
                    updatedAt: 1
                }
            } as Context;

            generateMock.mockImplementation(async () => {
                await writeFile(outputPath, "# ok\n", "utf-8");
                return { provider: "pi", text: "done" };
            });

            await generateFile(context, "Create readme", outputPath, { verify });

            expect(generateMock).toHaveBeenCalledWith(
                context,
                expect.any(String),
                expect.objectContaining({
                    expectedOutput: {
                        type: "file",
                        filePath: outputPath,
                        verify
                    }
                })
            );
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("keeps sourceFullName placeholder when source repo is not configured", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-generate-file-"));
        try {
            const outputPath = path.join(tempDir, "README.md");
            const context = {
                projectPath: tempDir,
                settings: {
                    version: 1,
                    updatedAt: 1
                }
            } as Context;

            generateMock.mockImplementation(async () => {
                await writeFile(outputPath, "# ok\n", "utf-8");
                return { provider: "pi", text: "done" };
            });

            await generateFile(context, "Source repo: {sourceFullName}. File: {outputPath}.", outputPath);

            expect(generateMock).toHaveBeenCalledWith(
                context,
                expect.stringContaining("Source repo: {sourceFullName}."),
                expect.any(Object)
            );
            expect(generateMock).toHaveBeenCalledWith(
                context,
                expect.stringContaining(`File: ${outputPath}.`),
                expect.any(Object)
            );
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
