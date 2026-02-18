import path from "node:path";

/**
 * Returns the local original source checkout path under projectPath/.beer/original.
 */
export function beerOriginalPathResolve(projectPath: string): string {
  return path.join(projectPath, ".beer", "original");
}
