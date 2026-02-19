import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { TreeChildEntry } from "@/types";

const treeChildrenSchema = z.array(
    z.object({
        title: z.string().min(1),
        slug: z.string().min(1)
    })
);

/**
 * Reads node children from `<dir>/children.json`.
 * Expects: dirPath points to a node directory; returns null when file does not exist.
 */
export async function treeChildrenRead(dirPath: string): Promise<TreeChildEntry[] | null> {
    const filePath = path.join(dirPath, "children.json");
    const raw = await treeFileReadOrNull(filePath);
    if (raw === null) {
        return null;
    }

    const parsed = treeJsonParse(filePath, raw);
    return treeChildrenSchema.parse(parsed);
}

async function treeFileReadOrNull(filePath: string): Promise<string | null> {
    try {
        return await readFile(filePath, "utf-8");
    } catch (error) {
        if (treeErrorIsNotFound(error)) {
            return null;
        }
        throw error;
    }
}

function treeJsonParse(filePath: string, raw: string): unknown {
    try {
        return JSON.parse(raw) as unknown;
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON at ${filePath}: ${detail}`);
    }
}

function treeErrorIsNotFound(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
