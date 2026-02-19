import type { ZodTypeAny } from "zod";
import type { ProviderModelSelectionMode } from "@/types";

export type TreeNodeStatus = "unexpanded" | "in-progress" | "expanded" | "leaf";

export interface TreeSearchConfig {
    rootDir: string;
    rootPrompt: string;
    concurrency?: number;
    maxDepth?: number;
    modelSelectionMode?: ProviderModelSelectionMode;
    frontmatterSchema?: ZodTypeAny;
    documentPrompt: (node: TreeNode) => string;
    childrenPrompt: (node: TreeNode) => string;
    pickerPrompt?: (treeOutline: string, leaves: TreeNode[]) => string;
}

export interface TreeNode {
    slug: string;
    title: string;
    depth: number;
    dirPath: string;
    parentDirPath: string;
    sessionId?: string;
    status: TreeNodeStatus;
    children: TreeNode[];
}

export interface TreeChildEntry {
    title: string;
    slug: string;
}

export interface TreeNodeDisk {
    title: string;
    slug: string;
    sessionId?: string;
    status: string;
}

export interface TreeSearchResult {
    totalExpanded: number;
    totalLeaves: number;
    totalSkipped: number;
}
