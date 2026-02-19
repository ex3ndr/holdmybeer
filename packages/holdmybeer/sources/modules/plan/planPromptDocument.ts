import type { PlanSourceDocument } from "@/modules/plan/planSourceDocumentTypes.js";
import type { TreeNode } from "@/types";

/**
 * Builds the node document prompt for a single task node in the planning tree.
 * Expects: node is the currently expanded planning node and source docs are readable.
 */
export function planPromptDocument(node: TreeNode, sourceDocuments: readonly PlanSourceDocument[]): string {
    const sources = sourceDocuments
        .map((entry, index) => `${index + 1}. ${entry.label}: ${entry.absolutePath}`)
        .join("\n");

    return [
        `Create an implementation task brief for: ${node.title}`,
        "",
        "Read the source documents and the existing session context before writing.",
        "",
        "Source documents:",
        sources,
        "",
        "Write a markdown file with YAML frontmatter and these sections:",
        "- Objective",
        "- Scope",
        "- Concrete Tasks",
        "- Dependencies",
        "- Risks",
        "- Validation",
        "- Definition of Done",
        "",
        "Frontmatter requirements:",
        `- title: ${node.title}`,
        `- slug: ${node.slug}`,
        `- depth: ${node.depth}`,
        "- status: planned",
        "",
        "Concrete Tasks must be a markdown checklist with actionable, testable steps.",
        "Prefer explicit file/module names and technical decisions over generic statements."
    ].join("\n");
}
