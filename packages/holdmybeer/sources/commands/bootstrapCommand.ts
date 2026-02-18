import { Command } from "commander";
import { workflowBootstrap } from "@/_workflows/_index.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

/**
 * Builds the bootstrap command entrypoint.
 */
export function bootstrapCommand(): Command {
  return new Command("bootstrap")
    .description(workflowBootstrap.title)
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<{ project?: string }>();
      const projectPath = pathResolveFromInitCwd(options.project ?? ".");
      const ctx = await contextGetOrInitialize(projectPath);
      await workflowBootstrap.run(ctx);
    });
}
