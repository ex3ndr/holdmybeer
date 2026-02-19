import path from "node:path";
import type { TreeNode } from "@/types";

/**
 * Resolves a node path relative to the tree root using slash-separated slugs.
 * Expects: node.dirPath is located under rootDir.
 */
export function treeNodePathResolve(rootDir: string, node: TreeNode): string {
    return path.relative(rootDir, node.dirPath).split(path.sep).join("/");
}
