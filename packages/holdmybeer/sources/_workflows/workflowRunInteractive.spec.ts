import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const selectMock = vi.hoisted(() => vi.fn());
const workflowBootstrappedResolveMock = vi.hoisted(() => vi.fn());
const bootstrapRunMock = vi.hoisted(() => vi.fn());
const ralphRunMock = vi.hoisted(() => vi.fn());

vi.mock("@inquirer/select", () => ({
  default: selectMock
}));

vi.mock("@/_workflows/workflowBootstrappedResolve.js", () => ({
  workflowBootstrappedResolve: workflowBootstrappedResolveMock
}));

vi.mock("@/_workflows/_index.js", () => ({
  workflows: [
    { id: "bootstrap", title: "Bootstrap", run: bootstrapRunMock },
    { id: "ralph-loop", title: "Ralph Loop", run: ralphRunMock }
  ]
}));

import { workflowRunInteractive } from "@/_workflows/workflowRunInteractive.js";

describe("workflowRunInteractive", () => {
  beforeEach(() => {
    selectMock.mockReset();
    workflowBootstrappedResolveMock.mockReset();
    bootstrapRunMock.mockReset();
    ralphRunMock.mockReset();
  });

  it("disables non-bootstrap workflow when settings are not bootstrapped", async () => {
    const ctx = { projectPath: "/tmp/project", providers: [], inferText: vi.fn(), stageAndCommit: vi.fn() } as unknown as Context;
    workflowBootstrappedResolveMock.mockResolvedValue(false);
    selectMock.mockResolvedValue("bootstrap");

    await workflowRunInteractive(ctx);

    const call = selectMock.mock.calls[0]?.[0];
    expect(call?.choices[0]).toMatchObject({ value: "bootstrap", disabled: undefined });
    expect(call?.choices[1]).toMatchObject({ value: "ralph-loop" });
    expect(String(call?.choices[1]?.disabled || "")).toContain("bootstrap");
    expect(bootstrapRunMock).toHaveBeenCalledWith(ctx);
    expect(ralphRunMock).not.toHaveBeenCalled();
  });

  it("allows selecting non-bootstrap workflow when bootstrapped", async () => {
    const ctx = { projectPath: "/tmp/project", providers: [], inferText: vi.fn(), stageAndCommit: vi.fn() } as unknown as Context;
    workflowBootstrappedResolveMock.mockResolvedValue(true);
    selectMock.mockResolvedValue("ralph-loop");

    await workflowRunInteractive(ctx);

    expect(ralphRunMock).toHaveBeenCalledWith(ctx);
    expect(bootstrapRunMock).not.toHaveBeenCalled();
  });
});
