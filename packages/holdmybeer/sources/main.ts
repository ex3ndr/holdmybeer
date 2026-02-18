import { Command } from "commander";
import { readFileSync } from "node:fs";
import { bootstrapCommand } from "./bootstrap/bootstrapCommand.js";
import { rewriteCommand } from "./commands/rewriteCommand.js";
import { contextInitialize } from "./context/contextInitialize.js";
import { pathResolveFromInitCwd } from "./util/pathResolveFromInitCwd.js";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

const program = new Command();

program
  .name("beer")
  .description("Bootstrap and rewrite codebases")
  .version(pkg.version);

program.addCommand(bootstrapCommand());
program.addCommand(rewriteCommand());

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

await contextInitialize(pathResolveFromInitCwd("."));
await program.parseAsync(process.argv);
