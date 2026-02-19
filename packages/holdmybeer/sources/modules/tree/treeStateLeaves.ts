import type { TreeNode } from "@/types";

/**
 * Collects unexpanded leaves whose parent is expanded.
 * Expects: nodes are root-level tree entries; root is treated as expanded.
 */
export function treeStateLeaves(nodes: readonly TreeNode[]): TreeNode[] {
    const leaves: TreeNode[] = [];
    for (const node of nodes) {
        treeStateLeavesCollect(leaves, node, "expanded");
    }
    return leaves;
}

function treeStateLeavesCollect(leaves: TreeNode[], node: TreeNode, parentStatus: TreeNode["status"]): void {
    if (node.status === "unexpanded" && parentStatus === "expanded") {
        leaves.push(node);
    }

    for (const child of node.children) {
        treeStateLeavesCollect(leaves, child, node.status);
    }
}
