import { SandboxManager, type SandboxRuntimeConfig } from "@anthropic-ai/sandbox-runtime";
import path from "node:path";
import { pathResolveFromInitCwd } from "../util/pathResolveFromInitCwd.js";
import type { CommandSandbox } from "./sandboxTypes.js";

let inferenceSandbox: CommandSandbox | undefined;
let inferenceSandboxPending: Promise<CommandSandbox> | undefined;

/**
 * Returns a singleton sandbox for inference commands.
 * Network is always allowed via callback, writes are limited to project dir except .beer.
 */
export async function sandboxInferenceGet(): Promise<CommandSandbox> {
  if (inferenceSandbox) {
    return inferenceSandbox;
  }

  if (inferenceSandboxPending) {
    return inferenceSandboxPending;
  }

  inferenceSandboxPending = initializeInferenceSandbox();
  try {
    inferenceSandbox = await inferenceSandboxPending;
    return inferenceSandbox;
  } finally {
    inferenceSandboxPending = undefined;
  }
}

async function initializeInferenceSandbox(): Promise<CommandSandbox> {
  const projectDir = pathResolveFromInitCwd(".");
  const beerDir = path.join(projectDir, ".beer");

  const config: SandboxRuntimeConfig = {
    network: {
      // Placeholder domain to satisfy strict config validation.
      // All unmatched domains are allowed by callback below.
      allowedDomains: ["example.com"],
      deniedDomains: []
    },
    filesystem: {
      denyRead: [],
      allowWrite: [projectDir],
      denyWrite: [path.join(beerDir, "**"), beerDir]
    }
  };

  await SandboxManager.initialize(config, async () => true);

  return {
    wrapCommand: (command, abortSignal) =>
      SandboxManager.wrapWithSandbox(command, undefined, undefined, abortSignal)
  };
}
