import path from "node:path";
import { text } from "@text";
import { z } from "zod";
import { planPromptChildren } from "@/modules/plan/planPromptChildren.js";
import { planPromptDocument } from "@/modules/plan/planPromptDocument.js";
import { planPromptPicker } from "@/modules/plan/planPromptPicker.js";
import { planPromptRoot } from "@/modules/plan/planPromptRoot.js";
import { planSourceDocumentsResolve } from "@/modules/plan/planSourceDocumentsResolve.js";
import { treeSearchRun } from "@/modules/tree/treeSearchRun.js";
import { treeStateRead } from "@/modules/tree/treeStateRead.js";
import { treeStateRender } from "@/modules/tree/treeStateRender.js";
import type { Context } from "@/types";

const planNodeFrontmatterSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    depth: z.number().int().nonnegative(),
    status: z.string().min(1)
});

/**
 * Builds a persisted implementation-task tree from blueprint and product source documents.
 * Expects: at least one planning source document exists in standard doc/ paths.
 */
export async function planWorkflow(ctx: Context): Promise<void> {
    const sourceDocuments = await planSourceDocumentsResolve(ctx.projectPath);
    if (sourceDocuments.length === 0) {
        throw new Error(text.error_plan_sources_required!);
    }

    const rootDirRelative = "doc/plan-tree";
    const rootDirAbsolute = path.resolve(ctx.projectPath, rootDirRelative);

    const result = await treeSearchRun(ctx, {
        rootDir: rootDirAbsolute,
        rootPrompt: planPromptRoot(sourceDocuments),
        concurrency: 4,
        maxDepth: 4,
        modelSelectionMode: "codex-xhigh",
        frontmatterSchema: planNodeFrontmatterSchema,
        documentPrompt: (node) => planPromptDocument(node, sourceDocuments),
        childrenPrompt: (node) => planPromptChildren(node, sourceDocuments),
        pickerPrompt: (treeOutline, leaves) => planPromptPicker(rootDirAbsolute, treeOutline, leaves)
    });

    const state = await treeStateRead(rootDirAbsolute);
    const outline = treeStateRender(state);
    const sources = sourceDocuments.map((entry) => `- ${entry.label}: ${entry.relativePath}`).join("\n");

    const summary = [
        "# Implementation Task Tree",
        "",
        "## Sources",
        sources,
        "",
        "## Output",
        `- Tree root: ${rootDirRelative}`,
        `- Expanded nodes: ${result.totalExpanded}`,
        `- Leaves: ${result.totalLeaves}`,
        `- Skipped (cached): ${result.totalSkipped}`,
        "",
        "## Current Outline",
        "```text",
        outline || "(empty)",
        "```",
        ""
    ].join("\n");

    await ctx.writeFile("doc/plan-tree.md", summary);
}
