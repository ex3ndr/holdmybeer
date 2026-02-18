import type { Context } from "./contextTypes.js";

/**
 * Returns the initialized global Context.
 * Expects: contextInitialize() was called first.
 */
export function contextGet(): Context {
  if (!globalThis.Context) {
    throw new Error("Context is not initialized. Run contextInitialize() first.");
  }

  return globalThis.Context;
}
