import { Command } from "commander";
import { readFileSync } from "node:fs";
import { bootstrapCommand } from "@/commands/bootstrapCommand.js";
import { ralphLoopCommand } from "@/commands/ralphLoopCommand.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import { workflowRunInteractive } from "@/_workflows/workflowRunInteractive.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

const program = new Command();

program
  .name("beer")
  .description("Bootstrap codebases")
  .option("--project <path>", "Project path used by bootstrap operations", ".")
  .version(pkg.version)
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<{ project?: string }>();
    const projectPath = pathResolveFromInitCwd(options.project ?? ".");
    const ctx = await contextGetOrInitialize(projectPath);
    await workflowRunInteractive(ctx);
  });

program.addCommand(bootstrapCommand());
program.addCommand(ralphLoopCommand());

await program.parseAsync(process.argv);
