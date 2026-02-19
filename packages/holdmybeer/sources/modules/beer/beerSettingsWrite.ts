import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BeerSettings } from "@/modules/beer/beerSettingsTypes.js";

/**
 * Persists .beer/settings.json with stable formatting.
 */
export async function beerSettingsWrite(settingsPath: string, settings: BeerSettings): Promise<void> {
    await mkdir(path.dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}
