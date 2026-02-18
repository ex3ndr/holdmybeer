import { readFile } from "node:fs/promises";
import type { BeerSettings } from "@/modules/beer/beerSettingsTypes.js";

/**
 * Reads settings.json or returns default settings when missing.
 */
export async function beerSettingsRead(settingsPath: string): Promise<BeerSettings> {
  const fallback: BeerSettings = {
    version: 1,
    providers: [],
    updatedAt: Date.now()
  };

  try {
    const content = await readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(content) as BeerSettings;
    return {
      ...fallback,
      ...parsed,
      updatedAt: Date.now()
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}
