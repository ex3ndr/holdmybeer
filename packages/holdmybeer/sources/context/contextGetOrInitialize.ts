import type { Context } from "./contextTypes.js";
import { contextInitialize } from "./contextInitialize.js";

/**
 * Returns existing global Context or initializes it on first use.
 */
export async function contextGetOrInitialize(): Promise<Context> {
  if (globalThis.Context) {
    return globalThis.Context;
  }

  return contextInitialize();
}
