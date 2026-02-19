import path from "node:path";
import { beerSettingsWrite } from "@/modules/beer/beerSettingsWrite.js";
import type { BeerSettings } from "@/types";

/**
 * Applies a mutation to current settings and persists the result to .beer/settings.json.
 * Expects: projectPath is the repository root.
 */
export async function contextApplyConfig(
    projectPath: string,
    current: Readonly<BeerSettings>,
    apply: (settings: BeerSettings) => void | Promise<void>
): Promise<BeerSettings> {
    const settingsPath = path.join(projectPath, ".beer", "settings.json");
    const next = contextSettingsClone(current);
    await apply(next);
    next.updatedAt = Date.now();
    await beerSettingsWrite(settingsPath, next);
    return next;
}

function contextSettingsClone(settings: Readonly<BeerSettings>): BeerSettings {
    return {
        ...settings,
        sourceRepo: settings.sourceRepo ? { ...settings.sourceRepo } : undefined,
        publishRepo: settings.publishRepo ? { ...settings.publishRepo } : undefined
    };
}
