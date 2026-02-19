import type { GitHubRepoRef } from "@/modules/github/githubTypes.js";

export interface BeerSettings {
    version: 1;
    sourceRepo?: GitHubRepoRef;
    sourceCommitHash?: string;
    publishRepo?: GitHubRepoRef;
    updatedAt: number;
}

export type { ProviderDetection } from "@/modules/providers/providerTypes.js";
