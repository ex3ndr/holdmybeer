import { z } from "zod";
import type { TreeChildEntry } from "@/types";

const treeChildrenSchema = z.array(
    z.object({
        title: z.string().min(1),
        slug: z.string().min(1)
    })
);

/**
 * Parses JSON text into normalized tree child entries.
 * Expects: text is a JSON array of `{ title, slug }` objects.
 */
export function treeChildrenParse(text: string): TreeChildEntry[] {
    const parsed = treeChildrenJsonParse(text);
    return treeChildrenSchema.parse(parsed);
}

function treeChildrenJsonParse(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Children output must be valid JSON: ${detail}`);
    }
}
