import { readFileSync } from "node:fs";
import path from "node:path";
import select from "@inquirer/select";
import { text } from "@text";
import { Command } from "commander";
import { type Workflow, workflows } from "@/_workflows/_index.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";
import { contextInitialize } from "@/modules/context/contextInitialize.js";
import { githubCliEnsure } from "@/modules/github/githubCliEnsure.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as { version: string };

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
        await githubCliEnsure();
        const ctx = await contextInitialize(projectPath);
        const bootstrapped = await mainWorkflowBootstrappedResolve(projectPath);
        const selectedWorkflowId = await select({
            message: text.prompt_workflow_select!,
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

function mainWorkflowDisabledReasonResolve(workflow: Workflow, bootstrapped: boolean): string | undefined {
    if (bootstrapped || workflow.id === "bootstrap") {
        return undefined;
    }
    return text.workflow_bootstrap_required!;
}

async function mainWorkflowBootstrappedResolve(projectPath: string): Promise<boolean> {
    const settingsPath = path.join(projectPath, ".beer", "settings.json");
    const settings = await beerSettingsRead(settingsPath);
    return Boolean(settings.sourceRepo && settings.publishRepo && settings.sourceCommitHash);
}
