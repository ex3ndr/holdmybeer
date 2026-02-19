import { treeNodePathResolve } from "@/modules/tree/treeNodePathResolve.js";
import type { TreeNode } from "@/types";

/**
 * Builds a picker prompt that prioritizes dependency-first planning of unexpanded leaves.
 * Expects: treeOutline is a rendered state and leaves contains only unexpanded candidates.
 */
export function planPromptPicker(rootDir: string, treeOutline: string, leaves: readonly TreeNode[]): string {
    const candidates = leaves.map((entry) => `- ${treeNodePathResolve(rootDir, entry)}`).join("\n");

    return [
        "You are sequencing implementation planning work.",
        "Select the next unexpanded task leaf to research in dependency-first order.",
        "",
        "Current tree:",
        treeOutline,
        "",
        "Candidate leaves:",
        candidates,
        "",
        "Selection criteria (in order):",
        "1. Unblocks the most other tasks",
        "2. Defines architecture/contracts early",
        "3. Reduces integration risk",
        "4. Covers missing critical scope",
        "",
        "Return ONLY one candidate path inside <output> tags.",
        "Example: <output>backend/api-contracts</output>"
    ].join("\n");
}
