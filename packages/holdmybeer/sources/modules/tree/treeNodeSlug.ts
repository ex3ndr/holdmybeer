/**
 * Converts a title to a filesystem-safe slug.
 * Expects: title is user-provided free text and output is limited to lowercase ASCII + hyphens.
 */
export function treeNodeSlug(title: string): string {
    const normalized = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!normalized) {
        return "node";
    }

    const limited = normalized.slice(0, 60).replace(/-+$/g, "");
    return limited || "node";
}
