import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TreeNodeDisk } from "@/types";

/**
 * Persists node metadata into `<dir>/node.json` using atomic rename.
 * Expects: nodeData contains title/slug/status and optional session id.
 */
export async function treeNodeWrite(dirPath: string, nodeData: TreeNodeDisk): Promise<void> {
    const filePath = path.join(dirPath, "node.json");
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = `${JSON.stringify(nodeData, null, 2)}\n`;
    await writeFile(tempPath, payload, "utf-8");
    await rename(tempPath, filePath);
}
