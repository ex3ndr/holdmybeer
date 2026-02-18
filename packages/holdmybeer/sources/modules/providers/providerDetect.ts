import type { ProviderDetection, ProviderId } from "@/modules/providers/providerTypes.js";
import { commandRun } from "@/modules/util/commandRun.js";
import { providerModelsGet } from "@/modules/providers/providerModelsGet.js";

interface ProviderProbe {
  id: ProviderId;
  priority: number;
  commands: string[];
}

const PROVIDER_PROBES: ProviderProbe[] = [
  {
    id: "pi",
    priority: 1,
    commands: ["pi"]
  }
];

/**
 * Detects installed provider CLIs by probing known command names.
 */
export async function providerDetect(): Promise<ProviderDetection[]> {
  const providers: ProviderDetection[] = [];

  for (const probe of PROVIDER_PROBES) {
    let resolved: ProviderDetection = {
      id: probe.id,
      available: false,
      priority: probe.priority
    };

    for (const command of probe.commands) {
      const result = await commandRun(command, ["--version"], {
        allowFailure: true,
        timeoutMs: 8_000
      }).catch(() => ({ exitCode: 1, stdout: "", stderr: "" }));

      if (result.exitCode === 0) {
        const models = await providerModelsGet(command);
        resolved = {
          id: probe.id,
          available: true,
          command,
          version: result.stdout.trim() || undefined,
          priority: probe.priority,
          models
        };
        break;
      }
    }

    providers.push(resolved);
  }

  return providers;
}
