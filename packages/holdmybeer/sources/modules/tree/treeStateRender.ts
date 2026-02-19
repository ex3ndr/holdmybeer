import type { TreeNode } from "@/types";

/**
 * Renders tree state into an indented outline consumable by picker prompts.
 * Expects: nodes are root-level entries (root itself is not rendered).
 */
export function treeStateRender(nodes: readonly TreeNode[]): string {
    const lines: string[] = [];
    for (const node of nodes) {
        treeStateRenderNode(lines, node, 0);
    }
    return lines.join("\n");
}

function treeStateRenderNode(lines: string[], node: TreeNode, level: number): void {
    const indent = "  ".repeat(level);
    lines.push(`${indent}- ${node.title} [${node.status}]`);
    for (const child of node.children) {
        treeStateRenderNode(lines, child, level + 1);
    }
}
