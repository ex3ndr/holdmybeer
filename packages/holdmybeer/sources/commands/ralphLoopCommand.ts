import { Command } from "commander";
import { workflowRalphLoop } from "@/_workflows/_index.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

/**
 * Builds the ralph-loop command entrypoint.
 */
export function ralphLoopCommand(): Command {
  return new Command("ralph-loop")
    .description(workflowRalphLoop.title)
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<{ project?: string }>();
      const projectPath = pathResolveFromInitCwd(options.project ?? ".");
      const ctx = await contextGetOrInitialize(projectPath);
      await workflowRalphLoop.run(ctx);
    });
}
