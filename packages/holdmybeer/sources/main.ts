import { Command } from "commander";
import { readFileSync } from "node:fs";
import select from "@inquirer/select";
import { workflows, type Workflow } from "@/_workflows/_index.js";
import { beerSettingsPathResolve } from "@/modules/beer/beerSettingsPathResolve.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import { text } from "@text";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
) as { version: string };

const program = new Command();

program
  .name("beer")
  .description("Run HoldMyBeer workflows")
  .option("--project <path>", "Project path used by bootstrap operations", ".")
  .version(pkg.version)
  .action(async function (this: Command) {
    const options = this.optsWithGlobals<{ project?: string }>();
    const projectPath = pathResolveFromInitCwd(options.project ?? ".");
    process.env.BEER_PROJECT_PATH = projectPath;
    const ctx = await contextGetOrInitialize(projectPath);
    const bootstrapped = await mainWorkflowBootstrappedResolve();
    const selectedWorkflowId = await select({
      message: text["prompt_workflow_select"]!,
      choices: workflows.map((workflow) => ({
        name: workflow.title,
        value: workflow.id,
        disabled: mainWorkflowDisabledReasonResolve(workflow, bootstrapped)
      }))
    });
    const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId);
    if (!selectedWorkflow) {
      throw new Error(`Unknown workflow: ${selectedWorkflowId}`);
    }
    await selectedWorkflow.run(ctx);
  });

await program.parseAsync(process.argv);

function mainWorkflowDisabledReasonResolve(
  workflow: Workflow,
  bootstrapped: boolean
): string | undefined {
  if (bootstrapped || workflow.id === "bootstrap") {
    return undefined;
  }
  return text["workflow_bootstrap_required"]!;
}

async function mainWorkflowBootstrappedResolve(): Promise<boolean> {
  const settings = await beerSettingsRead(beerSettingsPathResolve());
  return Boolean(
    settings.sourceRepo &&
    settings.publishRepo &&
    settings.sourceCommitHash
  );
}
