import type { GitHubRepoRef } from "@/modules/github/githubTypes.js";

export interface BeerSettings {
    version: 1;
    sourceRepo?: GitHubRepoRef;
    sourceCommitHash?: string;
    publishRepo?: GitHubRepoRef;
    /** AI-generated product name chosen during research workflow. */
    productName?: string;
    updatedAt: number;
}

export type { ProviderDetection } from "@/modules/providers/providerTypes.js";
