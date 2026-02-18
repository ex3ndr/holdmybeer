import type { GitHubRepoRef } from "../github/githubTypes.js";
import type { ProviderDetection } from "../providers/providerTypes.js";

export interface BeerSettings {
  version: 1;
  providers: ProviderDetection[];
  sourceRepo?: GitHubRepoRef;
  sourceCommitHash?: string;
  publishRepo?: GitHubRepoRef;
  updatedAt: number;
}

export type { ProviderDetection };
