import path from "node:path";
import { beerDevFolderResolve } from "@/modules/beer/beerDevFolderResolve.js";

/**
 * Returns the canonical settings file path under ~/Developer/HoldMyBeerDev/.beer/settings.json.
 */
export function beerSettingsPathResolve(): string {
  return path.join(beerDevFolderResolve(), ".beer", "settings.json");
}
