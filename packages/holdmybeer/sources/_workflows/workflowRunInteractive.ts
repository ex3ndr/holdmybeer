import select from "@inquirer/select";
import { workflows, type Workflow } from "@/_workflows/_index.js";
import { workflowBootstrappedResolve } from "@/_workflows/workflowBootstrappedResolve.js";
import type { Context } from "@/types";
import { text } from "@text";

/**
 * Shows an interactive workflow picker and runs selected workflow.
 * Expects: ctx is initialized for the project selected by CLI options.
 */
export async function workflowRunInteractive(ctx: Context): Promise<void> {
  const bootstrapped = await workflowBootstrappedResolve();
  const selectedWorkflowId = await select({
    message: text["prompt_workflow_select"]!,
    choices: workflows.map((workflow) => ({
      name: workflow.title,
      value: workflow.id,
      disabled: workflowDisabledReasonResolve(workflow, bootstrapped)
    }))
  });
  const selectedWorkflow = workflows.find((entry) => entry.id === selectedWorkflowId);
  if (!selectedWorkflow) {
    throw new Error(`Unknown workflow: ${selectedWorkflowId}`);
  }
  await selectedWorkflow.run(ctx);
}

function workflowDisabledReasonResolve(
  workflow: Workflow,
  bootstrapped: boolean
): string | undefined {
  if (bootstrapped || workflow.id === "bootstrap") {
    return undefined;
  }
  return text["workflow_bootstrap_required"]!;
}
