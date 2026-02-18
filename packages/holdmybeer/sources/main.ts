import { Command } from "commander";
import { readFileSync } from "node:fs";
import { bootstrapCommand } from "@/commands/bootstrapCommand.js";
import { contextInitialize } from "@/modules/context/contextInitialize.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

const program = new Command();

program
  .name("beer")
  .description("Bootstrap codebases")
  .version(pkg.version);

program.addCommand(bootstrapCommand());

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

await contextInitialize(pathResolveFromInitCwd("."));
await program.parseAsync(process.argv);
