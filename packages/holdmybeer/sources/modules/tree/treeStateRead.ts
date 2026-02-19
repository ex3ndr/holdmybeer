import path from "node:path";
import { treeChildrenRead } from "@/modules/tree/treeChildrenRead.js";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import type { TreeChildEntry, TreeNode, TreeNodeStatus } from "@/types";

/**
 * Reads persisted tree state from disk starting at root children.json.
 * Expects: rootDir is the tree root directory containing root-level children.json.
 */
export async function treeStateRead(rootDir: string): Promise<TreeNode[]> {
    const rootChildren = await treeChildrenRead(rootDir);
    if (!rootChildren) {
        return [];
    }

    return Promise.all(rootChildren.map((child) => treeStateReadNode(rootDir, child, 1)));
}

async function treeStateReadNode(parentDirPath: string, child: TreeChildEntry, depth: number): Promise<TreeNode> {
    const dirPath = path.join(parentDirPath, child.slug);
    const nodeDisk = await treeNodeRead(dirPath);
    const childrenDisk = await treeChildrenRead(dirPath);

    const children = childrenDisk
        ? await Promise.all(childrenDisk.map((entry) => treeStateReadNode(dirPath, entry, depth + 1)))
        : [];

    return {
        slug: nodeDisk?.slug ?? child.slug,
        title: nodeDisk?.title ?? child.title,
        depth,
        dirPath,
        parentDirPath,
        sessionId: nodeDisk?.sessionId,
        status: treeNodeStatusResolve(nodeDisk?.status),
        children
    };
}

function treeNodeStatusResolve(status: string | undefined): TreeNodeStatus {
    if (status === "unexpanded" || status === "in-progress" || status === "expanded" || status === "leaf") {
        return status;
    }
    return "unexpanded";
}
