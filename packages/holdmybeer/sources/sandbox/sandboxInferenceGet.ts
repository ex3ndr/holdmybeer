import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { sandboxInferenceFilesystemPolicy } from "./sandboxInferenceFilesystemPolicy.js";
import type { CommandSandbox } from "./sandboxTypes.js";
import type { InferenceWritePolicy } from "./sandboxInferenceTypes.js";

export interface SandboxInferenceGetInput {
  writePolicy?: InferenceWritePolicy;
}

/**
 * Returns a per-call sandbox for inference commands.
 * Network is unrestricted (no network config), writes follow writePolicy.
 */
export async function sandboxInferenceGet(
  input: SandboxInferenceGetInput = {}
): Promise<CommandSandbox> {
  const filesystem = sandboxInferenceFilesystemPolicy({
    writePolicy: input.writePolicy
  });

  return {
    wrapCommand: (command, abortSignal) =>
      SandboxManager.wrapWithSandbox(command, undefined, { filesystem }, abortSignal)
  };
}
