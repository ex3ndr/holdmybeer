import { beforeEach, describe, expect, it, vi } from "vitest";

const providerDetectMock = vi.hoisted(() => vi.fn());
const generateTextMock = vi.hoisted(() => vi.fn());
const gitStageAndCommitMock = vi.hoisted(() => vi.fn());

vi.mock("../providers/providerDetect.js", () => ({
  providerDetect: providerDetectMock
}));

vi.mock("../ai/generateText.js", () => ({
  generateText: generateTextMock
}));

vi.mock("../git/gitStageAndCommit.js", () => ({
  gitStageAndCommit: gitStageAndCommitMock
}));

import { contextInitialize } from "@/modules/context/contextInitialize.js";

describe("contextInitialize", () => {
  beforeEach(() => {
    providerDetectMock.mockReset();
    generateTextMock.mockReset();
    gitStageAndCommitMock.mockReset();
    globalThis.Context = undefined;
  });

  it("creates global Context with projectPath and wires inferText to generateText", async () => {
    providerDetectMock.mockResolvedValue([
      { id: "claude", available: true, command: "claude", priority: 1 },
      { id: "codex", available: true, command: "codex", priority: 2 }
    ]);
    generateTextMock.mockResolvedValue({ provider: "codex", text: "ok" });

    const context = await contextInitialize("/tmp/test-project");
    expect(context.projectPath).toBe("/tmp/test-project");

    const result = await context.inferText({
      providerPriority: ["codex", "claude"],
      prompt: "hello"
    });

    expect(globalThis.Context).toBe(context);
    expect(result).toEqual({ provider: "codex", text: "ok" });
    expect(generateTextMock).toHaveBeenCalledWith(
      context,
      "hello",
      {
        providerPriority: ["codex", "claude"],
        showProgress: undefined,
        writePolicy: undefined
      }
    );
  });

  it("wires stageAndCommit to gitStageAndCommit with projectPath", async () => {
    providerDetectMock.mockResolvedValue([]);
    gitStageAndCommitMock.mockResolvedValue(true);

    const context = await contextInitialize("/tmp/test-project");
    await context.stageAndCommit("test commit");

    expect(gitStageAndCommitMock).toHaveBeenCalledWith("test commit", "/tmp/test-project");
  });

  it("passes showProgress and writePolicy through to generate", async () => {
    providerDetectMock.mockResolvedValue([
      { id: "claude", available: true, command: "claude", priority: 1 }
    ]);
    generateTextMock.mockResolvedValue({ provider: "claude", text: "ok" });

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
      context,
      "hello",
      {
        providerPriority: ["claude"],
        showProgress: true,
        writePolicy: {
          mode: "write-whitelist",
          writablePaths: ["README.md"]
        }
      }
    );
  });
});
