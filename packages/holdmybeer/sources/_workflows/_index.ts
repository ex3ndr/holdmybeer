import type { Context } from "@/types";
import { bootstrapWorkflow } from "@/_workflows/bootstrapWorkflow.js";
import { ralphLoopWorkflow } from "@/_workflows/ralphLoopWorkflow.js";
import { text } from "@text";

export interface Workflow {
  id: "bootstrap" | "ralph-loop";
  title: string;
  run: (ctx: Context) => Promise<void>;
}

export const workflowBootstrap: Workflow = {
  id: "bootstrap",
  title: text["workflow_bootstrap_title"]!,
  run: bootstrapWorkflow
};

export const workflowRalphLoop: Workflow = {
  id: "ralph-loop",
  title: text["workflow_ralph_loop_title"]!,
  run: ralphLoopWorkflow
};

export const workflows: readonly Workflow[] = [
  workflowBootstrap,
  workflowRalphLoop
];
