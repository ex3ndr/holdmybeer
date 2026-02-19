import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { sandboxInferenceFilesystemPolicy } from "@/modules/sandbox/sandboxInferenceFilesystemPolicy.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";

export interface SandboxInferenceGetInput {
    writePolicy?: InferenceWritePolicy;
    projectPath?: string;
    enableWeakerNetworkIsolation?: boolean;
}

/**
 * Returns a per-call sandbox for inference commands.
 * Network is unrestricted (no network config), writes follow writePolicy.
 */
export async function sandboxInferenceGet(input: SandboxInferenceGetInput = {}): Promise<CommandSandbox> {
    const filesystem = sandboxInferenceFilesystemPolicy(
        input.projectPath
            ? {
                  writePolicy: input.writePolicy,
                  projectPath: input.projectPath
              }
            : {
                  writePolicy: input.writePolicy
              }
    );
    const options =
        typeof input.enableWeakerNetworkIsolation === "boolean"
            ? { filesystem, enableWeakerNetworkIsolation: input.enableWeakerNetworkIsolation }
            : { filesystem };

    return {
        wrapCommand: (command, abortSignal) => SandboxManager.wrapWithSandbox(command, undefined, options, abortSignal)
    };
}
