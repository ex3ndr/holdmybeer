import type { Context } from "@/types";
import { bootstrapWorkflow } from "@/_workflows/bootstrapWorkflow.js";
import { ralphLoopWorkflow } from "@/_workflows/ralphLoopWorkflow.js";

export interface Workflow {
  id: "bootstrap" | "ralph-loop";
  title: string;
  run: (ctx: Context) => Promise<void>;
}

export const workflowBootstrap: Workflow = {
  id: "bootstrap",
  title: "Initialize .beer settings, source/publish repos, README, and first push",
  run: bootstrapWorkflow
};

export const workflowRalphLoop: Workflow = {
  id: "ralph-loop",
  title: "Ask what to build, generate a plan, execute, and run 3 review rounds",
  run: ralphLoopWorkflow
};

export const workflows: readonly Workflow[] = [
  workflowBootstrap,
  workflowRalphLoop
];
