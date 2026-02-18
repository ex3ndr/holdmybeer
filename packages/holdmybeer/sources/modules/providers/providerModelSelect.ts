import type { ProviderDetection } from "@/types";

/**
 * Picks the best available provider model by ordered preference patterns.
 * Expects: provider models use provider/id format from providerModelsGet.
 */
export function providerModelSelect(
  provider: ProviderDetection,
  modelPriority: readonly string[] | undefined
): string | undefined {
  const models = provider.models ?? [];
  if (models.length === 0) {
    return undefined;
  }

  if (!modelPriority || modelPriority.length === 0) {
    return models[0]?.id;
  }

  for (const candidate of modelPriority) {
    const resolved = models.find((model) => providerModelMatches(model.id, candidate));
    if (resolved) {
      return resolved.id;
    }
  }

  return models[0]?.id;
}

function providerModelMatches(modelId: string, candidate: string): boolean {
  const modelIdNormalized = modelId.trim().toLowerCase();
  const candidateNormalized = candidate.trim().toLowerCase();
  if (!modelIdNormalized || !candidateNormalized) {
    return false;
  }

  if (providerModelMatchExact(modelIdNormalized, candidateNormalized)) {
    return true;
  }

  if (!candidateNormalized.includes("/") && modelIdNormalized.endsWith(`/${candidateNormalized}`)) {
    return true;
  }

  if (candidateNormalized.includes("*")) {
    return providerModelMatchGlob(modelIdNormalized, candidateNormalized);
  }

  return false;
}

function providerModelMatchExact(modelId: string, candidate: string): boolean {
  return modelId === candidate;
}

function providerModelMatchGlob(modelId: string, candidate: string): boolean {
  const pattern = candidate
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${pattern}$`, "i").test(modelId);
}
