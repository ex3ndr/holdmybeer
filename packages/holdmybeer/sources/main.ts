import { readFileSync } from "node:fs";
import select from "@inquirer/select";
import { text } from "@text";
import { Command } from "commander";
import { type Workflow, workflows } from "@/_workflows/_index.js";
import { Context } from "@/_workflows/context/context.js";
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
        const ctx = await Context.create(projectPath);
        const bootstrapped = mainWorkflowBootstrappedResolve(ctx);
        const selectedWorkflowId = await select({
            message: text.prompt_workflow_select!,
            choices: workflows.map((workflow) => ({
                name: `${workflow.id}: ${workflow.title}`,
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

function mainWorkflowBootstrappedResolve(ctx: Context): boolean {
    const settings = ctx.settings;
    return Boolean(settings.sourceRepo && settings.publishRepo && settings.sourceCommitHash);
}
