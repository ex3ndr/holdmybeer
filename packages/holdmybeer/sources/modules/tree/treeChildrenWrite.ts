import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TreeChildEntry } from "@/types";

/**
 * Persists node children into `<dir>/children.json` using atomic rename.
 * Expects: entries are pre-validated child title/slug pairs.
 */
export async function treeChildrenWrite(dirPath: string, entries: readonly TreeChildEntry[]): Promise<void> {
    const filePath = path.join(dirPath, "children.json");
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = `${JSON.stringify(entries, null, 2)}\n`;
    await writeFile(tempPath, payload, "utf-8");
    await rename(tempPath, filePath);
}
