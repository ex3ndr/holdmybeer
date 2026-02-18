import type { ProviderDetection, ProviderId } from "./providerTypes.js";

/**
 * Returns available providers ordered by requested provider id priority.
 */
export function providerPriorityList(
  providers: readonly ProviderDetection[],
  providerPriority: readonly ProviderId[]
): ProviderDetection[] {
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const orderedProviders: ProviderDetection[] = [];

  for (const providerId of providerPriority) {
    const provider = providersById.get(providerId);
    if (!provider?.available) {
      continue;
    }
    orderedProviders.push(provider);
  }

  return orderedProviders;
}
