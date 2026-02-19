import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";

/**
 * Creates a sandbox implementation that does not alter commands.
 * Expects: caller uses this only when provider execution must remain tool-free.
 */
export function sandboxPassthrough(): CommandSandbox {
    return {
        async wrapCommand(command: string): Promise<string> {
            return command;
        }
    };
}
