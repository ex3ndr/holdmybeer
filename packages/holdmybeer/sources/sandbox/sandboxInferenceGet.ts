import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import path from "node:path";
import { pathResolveFromInitCwd } from "../util/pathResolveFromInitCwd.js";
import type { CommandSandbox } from "./sandboxTypes.js";

let inferenceSandbox: CommandSandbox | undefined;

/**
 * Returns a singleton sandbox for inference commands.
 * Network is unrestricted (no network config), writes are limited to project dir except .beer.
 */
export async function sandboxInferenceGet(): Promise<CommandSandbox> {
  if (inferenceSandbox) {
    return inferenceSandbox;
  }

  const projectDir = pathResolveFromInitCwd(".");
  const beerDir = path.join(projectDir, ".beer");
  const filesystem = {
    denyRead: [],
    allowWrite: [projectDir],
    denyWrite: [path.join(beerDir, "**"), beerDir]
  };

  inferenceSandbox = {
    wrapCommand: (command, abortSignal) =>
      SandboxManager.wrapWithSandbox(command, undefined, { filesystem }, abortSignal)
  };
  return inferenceSandbox;
}
