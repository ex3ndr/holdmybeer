import type { PlanSourceDocument } from "@/modules/plan/planSourceDocumentTypes.js";
import type { TreeNode } from "@/types";

/**
 * Builds the node-children prompt for decomposing one task node into sub-tasks.
 * Expects: node document has been generated in the same session before this call.
 */
export function planPromptChildren(node: TreeNode, sourceDocuments: readonly PlanSourceDocument[]): string {
    const sources = sourceDocuments
        .map((entry, index) => `${index + 1}. ${entry.label}: ${entry.absolutePath}`)
        .join("\n");

    return [
        `Decompose this implementation node into direct child tasks: ${node.title}`,
        "",
        "Use the node document generated in this session as the primary context.",
        "You may also consult source documents:",
        sources,
        "",
        "Child-node rules:",
        "- Create only immediate children (one level deeper), not grandchildren",
        "- Children should be concrete and independently implementable",
        "- Avoid duplicates and generic placeholders",
        "- If node is already atomic, return []",
        "",
        "Output format requirements:",
        "- Return ONLY a JSON array",
        '- Each item must be: {"title": string, "slug": string}',
        "- Slug must be lowercase kebab-case ASCII, unique within siblings, max 60 chars",
        "- No markdown, no explanation"
    ].join("\n");
}
