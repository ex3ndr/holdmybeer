import path from "node:path";
import matter from "gray-matter";
import type { ZodIssue, ZodTypeAny } from "zod";
import { type GenerateFilePermissions, generateFile } from "@/modules/ai/generateFile.js";
import type { Context } from "@/types";

export interface GenerateFrontmatterOptions extends Omit<GenerateFilePermissions, "verify"> {}

export interface GenerateFrontmatterResult {
    provider?: string;
    sessionId?: string;
    text: string;
    filePath: string;
}

/**
 * Generates a file and requires YAML frontmatter that matches the given schema.
 * Expects: outputFilePath is project-relative or absolute and schema is a zod object-like validator.
 */
export async function generateFrontmatter(
    ctx: Context,
    prompt: string,
    outputFilePath: string,
    schema: ZodTypeAny,
    options: GenerateFrontmatterOptions = {}
): Promise<GenerateFrontmatterResult> {
    const resolvedOutputPath = pathResolveInProject(ctx.projectPath, outputFilePath);
    const result = await generateFile(ctx, prompt, resolvedOutputPath, {
        ...options,
        verify: ({ filePath, fileContent }) => {
            generateFrontmatterVerify(resolvedOutputPath, filePath, fileContent, schema);
        }
    });

    return {
        provider: result.provider,
        sessionId: result.sessionId,
        text: result.text,
        filePath: resolvedOutputPath
    };
}

function pathResolveInProject(projectPath: string, outputFilePath: string): string {
    if (path.isAbsolute(outputFilePath)) {
        return path.resolve(outputFilePath);
    }
    return path.resolve(projectPath, outputFilePath);
}

function generateFrontmatterVerify(
    expectedFilePath: string,
    filePath: string,
    fileContent: string,
    schema: ZodTypeAny
): void {
    if (path.resolve(filePath) !== expectedFilePath) {
        throw new Error(`File must be generated at path: ${expectedFilePath}`);
    }

    if (!matter.test(fileContent)) {
        throw new Error(`Generated file must include frontmatter: ${expectedFilePath}`);
    }

    const parsed = matter(fileContent);
    const parsedFrontmatter = schema.safeParse(parsed.data);
    if (!parsedFrontmatter.success) {
        const details = generateFrontmatterIssuesFormat(parsedFrontmatter.error.issues);
        throw new Error(`Generated frontmatter does not match schema: ${details}`);
    }
}

function generateFrontmatterIssuesFormat(issues: readonly ZodIssue[]): string {
    return issues
        .map((issue) => {
            const issuePath = issue.path.length > 0 ? issue.path.join(".") : "(root)";
            return `${issuePath}: ${issue.message}`;
        })
        .join("; ");
}
