import path from "node:path";
import { pathResolveFromInitCwd } from "../util/pathResolveFromInitCwd.js";

/**
 * Returns the local original source checkout path under .beer/original.
 */
export function beerOriginalPathResolve(): string {
  return path.join(pathResolveFromInitCwd("."), ".beer", "original");
}
