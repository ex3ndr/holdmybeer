import type { GitHubRepoRef } from "../github/githubTypes.js";
import type { ProviderDetection } from "../providers/providerTypes.js";

export interface BeerSettings {
  version: 1;
  providers: ProviderDetection[];
  sourceRepo?: GitHubRepoRef;
  publishRepo?: GitHubRepoRef;
  readmeProvider?: string;
  commitMessageProvider?: string;
  commitMessage?: string;
  updatedAt: number;
}

export type { ProviderDetection };
