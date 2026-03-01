/**
 * Returns true when review output explicitly signals no remaining issues.
 * Expects: text is the model review response.
 */
export function ralphReviewNoIssuesDetect(text: string): boolean {
    return /<no-issues\s*\/\s*>/i.test(text);
}
