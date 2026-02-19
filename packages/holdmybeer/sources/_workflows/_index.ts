import { text } from "@text";
import { bootstrap } from "@/_workflows/bootstrap.js";
import { checkpointWorkflow } from "@/_workflows/checkpointWorkflow.js";
import { ralphLoopWorkflow } from "@/_workflows/ralphLoopWorkflow.js";
import { researchWorkflow } from "@/_workflows/researchWorkflow.js";
import type { Context } from "@/types";

export interface Workflow {
    id: string;
    title: string;
    run: (ctx: Context) => Promise<void>;
}

export const workflowBootstrap: Workflow = {
    id: "bootstrap",
    title: text.workflow_bootstrap_title!,
    run: bootstrap
};

export const workflowRalphLoop: Workflow = {
    id: "execute",
    title: text.workflow_ralph_loop_title!,
    run: ralphLoopWorkflow
};

export const workflowResearch: Workflow = {
    id: "research",
    title: text.workflow_research_title!,
    run: researchWorkflow
};

export const workflowCheckpoint: Workflow = {
    id: "checkpoint",
    title: text.workflow_checkpoint_title!,
    run: checkpointWorkflow
};

export const workflows: readonly Workflow[] = [
    workflowBootstrap,
    workflowRalphLoop,
    workflowResearch,
    workflowCheckpoint
];
