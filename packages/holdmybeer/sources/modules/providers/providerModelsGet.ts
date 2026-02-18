import type { ProviderModel } from "@/types";
import { commandRun } from "@/modules/util/commandRun.js";

interface PiRpcResponse {
  id?: string;
  type?: string;
  success?: boolean;
  data?: {
    models?: Array<{
      provider?: string;
      id?: string;
      name?: string;
      reasoning?: boolean;
      contextWindow?: number;
      maxTokens?: number;
      input?: string[];
    }>;
  };
}

const RPC_MODELS_REQUEST = "{\"id\":\"models\",\"type\":\"get_available_models\"}\n";

/**
 * Queries the pi RPC API and returns currently available model ids.
 * Expects: command points to a working pi CLI binary.
 */
export async function providerModelsGet(command: string): Promise<ProviderModel[]> {
  const result = await commandRun(command, ["--mode", "rpc", "--no-session"], {
    allowFailure: true,
    timeoutMs: 15_000,
    input: RPC_MODELS_REQUEST
  });

  if (result.exitCode !== 0) {
    return [];
  }

  const models = providerModelsFromRpcOutput(result.stdout);
  return dedupeModels(models);
}

function providerModelsFromRpcOutput(stdout: string): ProviderModel[] {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const parsed = providerModelsRpcParse(line);
    if (!parsed || parsed.id !== "models" || parsed.type !== "response" || parsed.success !== true) {
      continue;
    }

    const rawModels = parsed.data?.models ?? [];
    return rawModels
      .map((entry) =>
        providerModelFromRpc({
          provider: entry.provider,
          modelId: entry.id,
          name: entry.name,
          reasoning: entry.reasoning,
          contextWindow: entry.contextWindow,
          maxTokens: entry.maxTokens,
          input: entry.input
        })
      )
      .filter((entry): entry is ProviderModel => entry !== null);
  }

  return [];
}

function providerModelsRpcParse(line: string): PiRpcResponse | null {
  try {
    return JSON.parse(line) as PiRpcResponse;
  } catch {
    return null;
  }
}

function providerModelFromRpc(input: {
  provider?: string;
  modelId?: string;
  name?: string;
  reasoning?: boolean;
  contextWindow?: number;
  maxTokens?: number;
  input?: string[];
}): ProviderModel | null {
  const providerResolved = input.provider?.trim();
  const modelIdResolved = input.modelId?.trim();
  if (!providerResolved || !modelIdResolved) {
    return null;
  }

  const inputTypes = (input.input ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return {
    id: `${providerResolved}/${modelIdResolved}`,
    provider: providerResolved,
    modelId: modelIdResolved,
    name: input.name?.trim() || undefined,
    reasoning: typeof input.reasoning === "boolean" ? input.reasoning : undefined,
    contextWindow:
      typeof input.contextWindow === "number" && Number.isFinite(input.contextWindow)
        ? input.contextWindow
        : undefined,
    maxTokens:
      typeof input.maxTokens === "number" && Number.isFinite(input.maxTokens)
        ? input.maxTokens
        : undefined,
    input: inputTypes.length > 0 ? inputTypes : undefined
  };
}

function dedupeModels(models: ProviderModel[]): ProviderModel[] {
  const deduped = new Map<string, ProviderModel>();
  for (const model of models) {
    const existing = deduped.get(model.id);
    if (!existing) {
      deduped.set(model.id, model);
      continue;
    }
    deduped.set(model.id, providerModelMerge(existing, model));
  }
  return Array.from(deduped.values());
}

function providerModelMerge(existing: ProviderModel, incoming: ProviderModel): ProviderModel {
  return {
    id: existing.id,
    provider: existing.provider,
    modelId: existing.modelId,
    name: incoming.name ?? existing.name,
    reasoning: incoming.reasoning ?? existing.reasoning,
    contextWindow: incoming.contextWindow ?? existing.contextWindow,
    maxTokens: incoming.maxTokens ?? existing.maxTokens,
    input: incoming.input ?? existing.input
  };
}
