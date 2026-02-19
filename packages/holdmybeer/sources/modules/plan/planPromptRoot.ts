import type { PlanSourceDocument } from "@/modules/plan/planSourceDocumentTypes.js";

/**
 * Builds the root planning prompt that enumerates exhaustive level-1 task streams.
 * Expects: sourceDocuments contains at least one planning input document path.
 */
export function planPromptRoot(sourceDocuments: readonly PlanSourceDocument[]): string {
    const sources = sourceDocuments
        .map((entry, index) => `${index + 1}. ${entry.label}: ${entry.absolutePath}`)
        .join("\n");

    return [
        "You are planning implementation work for a software product.",
        "Read all source documents listed below before answering.",
        "",
        "Source documents:",
        sources,
        "",
        "Return an EXHAUSTIVE first-level decomposition of implementation workstreams.",
        "The list should cover backend, frontend, data, infrastructure, security, testing, and rollout as relevant.",
        "",
        "Output format requirements:",
        "- Return ONLY a JSON array",
        '- Each item must be: {"title": string, "slug": string}',
        "- Slug must be lowercase kebab-case ASCII, unique, max 60 chars",
        "- Include between 6 and 14 top-level workstreams",
        "- No markdown, no explanation"
    ].join("\n");
}
