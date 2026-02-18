/**
 * Builds the canonical HTTPS URL for a GitHub repository.
 */
export function githubRepoUrlBuild(fullName: string): string {
  return `https://github.com/${fullName}.git`;
}
