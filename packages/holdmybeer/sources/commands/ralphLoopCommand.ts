import { Command } from "commander";
import { ralphLoop } from "@/apps/ralphLoop.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

/**
 * Builds the ralph-loop command entrypoint.
 */
export function ralphLoopCommand(): Command {
  return new Command("ralph-loop")
    .description("Ask what to build, generate a plan, execute, and run 3 review rounds")
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<{ project?: string }>();
      const projectPath = pathResolveFromInitCwd(options.project ?? ".");
      await ralphLoop(projectPath);
    });
}
