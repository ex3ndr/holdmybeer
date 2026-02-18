import { Command } from "commander";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import { ralphLoopWorkflow } from "@/workflows/ralphLoopWorkflow.js";

/**
 * Builds the ralph-loop command entrypoint.
 */
export function ralphLoopCommand(): Command {
  return new Command("ralph-loop")
    .description("Ask what to build, generate a plan, execute, and run 3 review rounds")
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<{ project?: string }>();
      const projectPath = pathResolveFromInitCwd(options.project ?? ".");
      await ralphLoopWorkflow(projectPath);
    });
}
