import type { ProviderDetection } from "./providerTypes.js";

/**
 * Returns available providers ordered by configured priority.
 */
export function providerPriorityList(providers: ProviderDetection[]): ProviderDetection[] {
  return providers
    .filter((provider) => provider.available)
    .sort((a, b) => a.priority - b.priority);
}
