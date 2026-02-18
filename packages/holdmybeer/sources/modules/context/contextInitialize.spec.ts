import { beforeEach, describe, expect, it, vi } from "vitest";

const providerDetectMock = vi.hoisted(() => vi.fn());
const generateTextMock = vi.hoisted(() => vi.fn());
const sandboxInferenceGetMock = vi.hoisted(() => vi.fn());
const gitStageAndCommitMock = vi.hoisted(() => vi.fn());

vi.mock("../providers/providerDetect.js", () => ({
  providerDetect: providerDetectMock
}));

vi.mock("../ai/generateText.js", () => ({
  generateText: generateTextMock
}));

vi.mock("../sandbox/sandboxInferenceGet.js", () => ({
  sandboxInferenceGet: sandboxInferenceGetMock
}));

vi.mock("../git/gitStageAndCommit.js", () => ({
  gitStageAndCommit: gitStageAndCommitMock
}));

import { contextInitialize } from "@/modules/context/contextInitialize.js";

describe("contextInitialize", () => {
  beforeEach(() => {
    providerDetectMock.mockReset();
    generateTextMock.mockReset();
    sandboxInferenceGetMock.mockReset();
    gitStageAndCommitMock.mockReset();
    globalThis.Context = undefined;
  });

  it("creates global Context with projectPath and wires inferText", async () => {
    providerDetectMock.mockResolvedValue([
      { id: "claude", available: true, command: "claude", priority: 1 },
      { id: "codex", available: true, command: "codex", priority: 2 }
    ]);
    const sandbox = { wrapCommand: vi.fn() };
    sandboxInferenceGetMock.mockResolvedValue(sandbox);
    generateTextMock.mockResolvedValue({ provider: "codex", text: "ok" });

    const context = await contextInitialize("/tmp/test-project");
    expect(context.projectPath).toBe("/tmp/test-project");
    expect(sandboxInferenceGetMock).not.toHaveBeenCalled();

    const result = await context.inferText({
      providerPriority: ["codex", "claude"],
      prompt: "hello"
    });

    expect(globalThis.Context).toBe(context);
    expect(result).toEqual({ provider: "codex", text: "ok" });
    expect(sandboxInferenceGetMock).toHaveBeenCalledWith({
      writePolicy: undefined
    });
    expect(generateTextMock).toHaveBeenCalledWith(
      context.providers,
      ["codex", "claude"],
      "hello",
      { onMessage: undefined, sandbox, writePolicy: undefined }
    );
  });

  it("wires stageAndCommit to gitStageAndCommit with projectPath", async () => {
    providerDetectMock.mockResolvedValue([]);
    sandboxInferenceGetMock.mockResolvedValue(null);
    gitStageAndCommitMock.mockResolvedValue(true);

    const context = await contextInitialize("/tmp/test-project");
    await context.stageAndCommit("test commit");

    expect(gitStageAndCommitMock).toHaveBeenCalledWith("test commit", "/tmp/test-project");
  });

  it("wires progress output when showProgress is enabled", async () => {
    providerDetectMock.mockResolvedValue([
      { id: "claude", available: true, command: "claude", priority: 1 }
    ]);
    const sandbox = { wrapCommand: vi.fn() };
    sandboxInferenceGetMock.mockResolvedValue(sandbox);
    generateTextMock.mockResolvedValue({ provider: "claude", text: "ok" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const context = await contextInitialize("/tmp/test-project");

    await context.inferText({
      providerPriority: ["claude"],
      prompt: "hello",
      showProgress: true,
      writePolicy: {
        mode: "write-whitelist",
        writablePaths: ["README.md"]
      }
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      context.providers,
      ["claude"],
      "hello",
      {
        onMessage: expect.any(Function),
        sandbox,
        writePolicy: {
          mode: "write-whitelist",
          writablePaths: ["README.md"]
        }
      }
    );
    expect(sandboxInferenceGetMock).toHaveBeenCalledWith({
      writePolicy: {
        mode: "write-whitelist",
        writablePaths: ["README.md"]
      }
    });

    const onMessage = generateTextMock.mock.calls[0]?.[3]?.onMessage as
      | ((message: string) => void)
      | undefined;
    onMessage?.("test message");
    expect(logSpy).toHaveBeenCalledWith("test message");

    logSpy.mockRestore();
  });
});
