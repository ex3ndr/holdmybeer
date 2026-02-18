import type { Context } from "@/modules/context/contextTypes.js";
import { contextInitialize } from "@/modules/context/contextInitialize.js";

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
