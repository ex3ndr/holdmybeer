import { Command } from "commander";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import { bootstrapWorkflow } from "@/_workflows/bootstrapWorkflow.js";

/**
 * Builds the bootstrap command entrypoint.
 */
export function bootstrapCommand(): Command {
  return new Command("bootstrap")
    .description("Initialize .beer settings, source/publish repos, README, and first push")
    .action(async function (this: Command) {
      const options = this.optsWithGlobals<{ project?: string }>();
      const projectPath = pathResolveFromInitCwd(options.project ?? ".");
      await bootstrapWorkflow(projectPath);
    });
}
