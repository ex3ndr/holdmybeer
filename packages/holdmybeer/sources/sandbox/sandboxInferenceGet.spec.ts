import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const wrapWithSandboxMock = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sandbox-runtime", () => ({
  SandboxManager: {
    wrapWithSandbox: wrapWithSandboxMock
  }
}));

vi.mock("../util/pathResolveFromInitCwd.js", () => ({
  pathResolveFromInitCwd: () => "/workspace/project"
}));

describe("sandboxInferenceGet", () => {
  beforeEach(() => {
    vi.resetModules();
    wrapWithSandboxMock.mockReset();
  });

  it("returns singleton and applies filesystem-only policy per command", async () => {
    const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");

    const first = await sandboxInferenceGet();
    const second = await sandboxInferenceGet();

    expect(first).toBe(second);
  });

  it("wraps command using sandbox manager", async () => {
    wrapWithSandboxMock.mockResolvedValue("wrapped-command");
    const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");

    const sandbox = await sandboxInferenceGet();
    const wrapped = await sandbox.wrapCommand("echo hi");

    expect(wrapped).toBe("wrapped-command");
    expect(wrapWithSandboxMock).toHaveBeenCalledWith(
      "echo hi",
      undefined,
      {
        filesystem: {
          denyRead: [],
          allowWrite: ["/workspace/project"],
          denyWrite: [
            path.join("/workspace/project", ".beer", "**"),
            path.join("/workspace/project", ".beer")
          ]
        }
      },
      undefined
    );
  });
});
