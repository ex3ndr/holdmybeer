import { text } from "@text";
import type { Context } from "@/modules/context/contextTypes.js";

/**
 * Returns the initialized global Context.
 * Expects: contextInitialize() was called first.
 */
export function contextGet(): Context {
    if (!globalThis.Context) {
        throw new Error(text.error_context_not_initialized!);
    }

    return globalThis.Context;
}
