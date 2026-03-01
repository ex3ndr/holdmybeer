import { describe, expect, it } from "vitest";
import { workflowBootstrapRequired } from "@/modules/workflow/workflowBootstrapRequired.js";

describe("workflowBootstrapRequired", () => {
    it("allows bootstrap without bootstrap state", () => {
        expect(workflowBootstrapRequired("bootstrap")).toBe(false);
    });

    it("allows ralph without bootstrap state", () => {
        expect(workflowBootstrapRequired("ralph")).toBe(false);
    });

    it("requires bootstrap for other workflows", () => {
        expect(workflowBootstrapRequired("execute")).toBe(true);
        expect(workflowBootstrapRequired("research")).toBe(true);
        expect(workflowBootstrapRequired("plan")).toBe(true);
        expect(workflowBootstrapRequired("checkpoint")).toBe(true);
    });
});
