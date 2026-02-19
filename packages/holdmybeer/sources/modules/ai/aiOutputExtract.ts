/**
 * Extracts generated output from <output>...</output> tags (case-insensitive).
 * Returns null when tags are missing or empty.
 */
export function aiOutputExtract(text: string): string | null {
    const match = text.match(/<output>([\s\S]*?)<\/output>/i);
    if (!match) {
        return null;
    }
    const output = match[1]?.trim();
    if (!output) {
        return null;
    }
    return output;
}
