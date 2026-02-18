import type { Context } from "./contextTypes.js";
import { contextInitialize } from "./contextInitialize.js";

/**
 * Returns existing global Context or initializes it on first use.
 * Expects: projectPath is required on first call; ignored when context already exists.
 */
export async function contextGetOrInitialize(projectPath: string): Promise<Context> {
  if (globalThis.Context) {
    return globalThis.Context;
  }

  return contextInitialize(projectPath);
}
