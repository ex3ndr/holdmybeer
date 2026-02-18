import os from "node:os";
import path from "node:path";

/**
 * Returns the canonical holdmybeer development folder under the user home directory.
 */
export function beerDevFolderResolve(): string {
  return path.join(os.homedir(), "Developer", "HoldMyBeerDev");
}
