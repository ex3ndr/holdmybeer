import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { type GenerateExpectedFileOutputVerify, type GeneratePermissions, generate } from "@/modules/ai/generate.js";
import { beerOriginalPathResolve } from "@/modules/beer/beerOriginalPathResolve.js";
import type { Context } from "@/types";

export interface GenerateFilePermissions extends Omit<GeneratePermissions, "expectedOutput"> {
    retries?: number;
    verify?: GenerateExpectedFileOutputVerify;
    /** Extra template values to substitute in the prompt alongside the built-in ones. */
    extraTemplateValues?: Record<string, string>;
}

/**
 * Generates content and asks the model to write it into a specific file path only.
 * Retries when inference succeeds but the target file does not appear on disk.
 */
export async function generateFile(
    context: Context,
    prompt: string,
    outputFilePath: string,
    permissions: GenerateFilePermissions = {}
): Promise<{ provider?: string; sessionId?: string; text: string }> {
    const { retries, verify, extraTemplateValues, ...permissionsBase } = permissions;
    const resolvedOutputPath = pathResolveInProject(context.projectPath, outputFilePath);
    await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    const promptTemplateValues: Record<string, string | undefined> = {
        originalCheckoutPath: beerOriginalPathResolve(context.projectPath),
        outputPath: resolvedOutputPath,
        sourceFullName: context.settings.sourceRepo?.fullName,
        ...extraTemplateValues
    };
    const maxRetries = Math.max(0, retries ?? 1);
    const basePrompt = [
        promptFormat(prompt, promptTemplateValues),
        `Write the final result only to this file: ${resolvedOutputPath}.`,
        "Do not write to any other files."
    ].join("\n\n");
    const expectedOutput = verify
        ? { type: "file" as const, filePath: resolvedOutputPath, verify }
        : { type: "file" as const, filePath: resolvedOutputPath };
    const permissionsResolved: GeneratePermissions = {
        ...permissionsBase,
        expectedOutput,
        writePolicy: {
            mode: "write-whitelist",
            writablePaths: [resolvedOutputPath]
        }
    };

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const promptResolved =
            attempt === 0
                ? basePrompt
                : [basePrompt, `Last time file did not appear at ${resolvedOutputPath} - create it now.`].join("\n\n");
        const result = await generate(context, promptResolved, permissionsResolved);

        if (await fileExists(resolvedOutputPath)) {
            return result;
        }
    }

    throw new Error(`Inference did not create expected file: ${resolvedOutputPath}`);
}

function pathResolveInProject(projectPath: string, outputFilePath: string): string {
    if (path.isAbsolute(outputFilePath)) {
        return path.resolve(outputFilePath);
    }
    return path.resolve(projectPath, outputFilePath);
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        const fileStat = await stat(filePath);
        return fileStat.isFile();
    } catch {
        return false;
    }
}

function promptFormat(prompt: string, values: Record<string, string | undefined>): string {
    return prompt.replace(/\{(\w+)\}/g, (match: string, key: string) => {
        const value = values[key];
        return value === undefined ? match : value;
    });
}
