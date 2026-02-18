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
      .map((entry) => providerModelFromRpc(entry.provider, entry.id))
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

function providerModelFromRpc(provider: string | undefined, modelId: string | undefined): ProviderModel | null {
  const providerResolved = provider?.trim();
  const modelIdResolved = modelId?.trim();
  if (!providerResolved || !modelIdResolved) {
    return null;
  }

  return {
    id: `${providerResolved}/${modelIdResolved}`,
    provider: providerResolved,
    modelId: modelIdResolved
  };
}

function dedupeModels(models: ProviderModel[]): ProviderModel[] {
  const deduped = new Map<string, ProviderModel>();
  for (const model of models) {
    deduped.set(model.id, model);
  }
  return Array.from(deduped.values());
}
