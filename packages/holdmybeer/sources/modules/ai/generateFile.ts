import { stat } from "node:fs/promises";
import path from "node:path";
import type { Context } from "@/types";
import { generate, type GeneratePermissions } from "@/modules/ai/generate.js";

export interface GenerateFilePermissions extends GeneratePermissions {
  retries?: number;
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
): Promise<{ provider?: string; text: string }> {
  const resolvedOutputPath = pathResolveInProject(context.projectPath, outputFilePath);
  const maxRetries = Math.max(0, permissions.retries ?? 1);
  const basePrompt = [
    prompt,
    `Write the final result only to this file: ${resolvedOutputPath}.`,
    "Do not write to any other files."
  ].join("\n\n");
  const permissionsResolved: GeneratePermissions = {
    ...permissions,
    expectedOutput: {
      type: "file",
      filePath: resolvedOutputPath
    },
    writePolicy: {
      mode: "write-whitelist",
      writablePaths: [resolvedOutputPath]
    }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const promptResolved = attempt === 0
      ? basePrompt
      : [
          basePrompt,
          `Last time file did not appear at ${resolvedOutputPath} - create it now.`
        ].join("\n\n");
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
