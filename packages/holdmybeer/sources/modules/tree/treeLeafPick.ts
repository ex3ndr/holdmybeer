import { text } from "@text";
import { generateText } from "@/modules/ai/generateText.js";
import { treeInferenceProgressRun } from "@/modules/tree/treeInferenceProgressRun.js";
import { treeNodePathResolve } from "@/modules/tree/treeNodePathResolve.js";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import { treeStateLeaves } from "@/modules/tree/treeStateLeaves.js";
import { treeStateRead } from "@/modules/tree/treeStateRead.js";
import { treeStateRender } from "@/modules/tree/treeStateRender.js";
import type { Context, TreeNode, TreeSearchConfig } from "@/types";

/**
 * Picks the next unexpanded leaf using an inference call over the rendered tree state.
 * Expects: config.rootDir contains persisted tree node metadata.
 */
export async function treeLeafPick(ctx: Context, config: TreeSearchConfig): Promise<TreeNode | null> {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const state = await treeStateRead(config.rootDir);
        const leaves = treeStateLeaves(state);
        if (leaves.length === 0) {
            return null;
        }

        const treeOutline = treeStateRender(state);
        const prompt =
            config.pickerPrompt?.(treeOutline, leaves) ??
            treeLeafPickPromptDefault(config.rootDir, treeOutline, leaves);
        const result = await treeInferenceProgressRun(ctx, text.tree_search_picking_leaf!, async (onEvent) => {
            return generateText(ctx, prompt, {
                modelSelectionMode: config.modelSelectionMode,
                onEvent
            });
        });
        const selectedPath = treeLeafPathNormalize(result.text);
        const selected = leaves.find((leaf) => treeNodePathResolve(config.rootDir, leaf) === selectedPath);
        if (!selected) {
            continue;
        }

        const latestNode = await treeNodeRead(selected.dirPath);
        if (latestNode?.status === "in-progress") {
            continue;
        }
        if (latestNode && latestNode.status !== "unexpanded") {
            continue;
        }

        return selected;
    }

    return null;
}

function treeLeafPickPromptDefault(rootDir: string, treeOutline: string, leaves: readonly TreeNode[]): string {
    const candidates = leaves.map((leaf) => `- ${treeNodePathResolve(rootDir, leaf)}`).join("\n");

    return [
        "You are a research planner analyzing a tree of topics being explored.",
        "",
        "Here is the current state of the research tree:",
        treeOutline,
        "",
        "Candidate unexpanded leaves:",
        candidates,
        "",
        "Select the ONE most important unexpanded leaf to research next.",
        "Consider: coverage gaps, dependencies between topics, foundational vs advanced.",
        "",
        "Return ONLY the slug path inside <output> tags.",
        "Example: <output>authentication-system/oauth2-flow</output>"
    ].join("\n");
}

function treeLeafPathNormalize(raw: string): string {
    return raw.trim().replace(/^\/+|\/+$/g, "");
}
