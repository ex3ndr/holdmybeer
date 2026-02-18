import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const initializeMock = vi.hoisted(() => vi.fn());
const wrapWithSandboxMock = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sandbox-runtime", () => ({
  SandboxManager: {
    initialize: initializeMock,
    wrapWithSandbox: wrapWithSandboxMock
  }
}));

vi.mock("../util/pathResolveFromInitCwd.js", () => ({
  pathResolveFromInitCwd: () => "/workspace/project"
}));

describe("sandboxInferenceGet", () => {
  beforeEach(() => {
    vi.resetModules();
    initializeMock.mockReset();
    wrapWithSandboxMock.mockReset();
  });

  it("initializes sandbox once with fixed policy and returns singleton", async () => {
    const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");

    const first = await sandboxInferenceGet();
    const second = await sandboxInferenceGet();

    expect(first).toBe(second);
    expect(initializeMock).toHaveBeenCalledTimes(1);

    const config = initializeMock.mock.calls[0]?.[0];
    expect(config).toEqual({
      network: {
        allowedDomains: ["example.com"],
        deniedDomains: []
      },
      filesystem: {
        denyRead: [],
        allowWrite: ["/workspace/project"],
        denyWrite: [
          path.join("/workspace/project", ".beer", "**"),
          path.join("/workspace/project", ".beer")
        ]
      }
    });

    const askCallback = initializeMock.mock.calls[0]?.[1] as
      | ((input: { host: string; port: number }) => Promise<boolean>)
      | undefined;
    await expect(askCallback?.({ host: "api.openai.com", port: 443 })).resolves.toBe(true);
  });

  it("wraps command using sandbox manager", async () => {
    wrapWithSandboxMock.mockResolvedValue("wrapped-command");
    const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");

    const sandbox = await sandboxInferenceGet();
    const wrapped = await sandbox.wrapCommand("echo hi");

    expect(wrapped).toBe("wrapped-command");
    expect(wrapWithSandboxMock).toHaveBeenCalledWith("echo hi", undefined, undefined, undefined);
  });
});
