import path from "node:path";
import { pathResolveFromInitCwd } from "../util/pathResolveFromInitCwd.js";

/**
 * Returns the canonical settings file path under .beer/settings.json.
 */
export function beerSettingsPathResolve(): string {
  return path.join(pathResolveFromInitCwd("."), ".beer", "settings.json");
}
