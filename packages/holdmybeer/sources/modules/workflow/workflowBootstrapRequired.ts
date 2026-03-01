/**
 * Returns whether a workflow requires bootstrap settings to be present.
 * Expects: workflowId is the registered workflow identifier from workflow registry.
 */
export function workflowBootstrapRequired(workflowId: string): boolean {
    if (workflowId === "bootstrap" || workflowId === "ralph") {
        return false;
    }
    return true;
}
