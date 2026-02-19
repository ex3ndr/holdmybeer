import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const contextGetMock = vi.hoisted(() => vi.fn());
const generateMock = vi.hoisted(() => vi.fn());
const stepProgressStartMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/context/contextGet.js", () => ({
  contextGet: contextGetMock
}));

vi.mock("@/modules/ai/generate.js", () => ({
  generate: generateMock
}));

vi.mock("@/_workflows/steps/stepProgressStart.js", () => ({
  stepProgressStart: stepProgressStartMock
}));

import { runInference } from "@/_workflows/steps/runInference.js";
import { text } from "@text";

describe("runInference", () => {
  beforeEach(() => {
    contextGetMock.mockReset();
    generateMock.mockReset();
    stepProgressStartMock.mockReset();
  });

  it("loads global context and resolves handlebars in prompt", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=content_block_delta delta=text_delta");
      return { provider: "pi", text: "done" };
    });

    const result = await runInference("Say {{word}} for {{repo}}", {
      word: "hello",
      repo: "owner/repo"
    }, {
      progressMessage: "Generating test output",
      showProgress: true,
      modelSelectionMode: "codex-high"
    });

    expect(result).toEqual({ provider: "pi", text: "done" });
    expect(contextGetMock).toHaveBeenCalledTimes(1);
    expect(stepProgressStartMock).toHaveBeenCalledWith("Generating test output");
    expect(progress.update).toHaveBeenCalledWith(
      "Generating test output (writing)"
    );
    expect(progress.done).toHaveBeenCalledTimes(1);
    expect(progress.fail).not.toHaveBeenCalled();
    expect(generateMock).toHaveBeenCalledWith(
      context,
      "Say hello for owner/repo",
      expect.objectContaining({
        showProgress: true,
        modelSelectionMode: "codex-high",
        onEvent: expect.any(Function)
      })
    );
  });

  it("suppresses protocol-level events from spinner", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=turn_start");
      permissions.onEvent?.("provider=pi event=message_start role=assistant");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).not.toHaveBeenCalled();
  });

  it("shows 'thinking' for thinking delta events", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=content_block_delta delta=thinking_delta");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).toHaveBeenCalledWith(
      "Generating README.md (thinking)"
    );
  });

  it("shows 'writing' for text delta events", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=content_block_delta delta=text_delta");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).toHaveBeenCalledWith(
      "Generating README.md (writing)"
    );
  });

  it("shows 'using tools' for tool use events", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=content_block_start content=tool_use");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).toHaveBeenCalledWith(
      "Generating README.md (using tools)"
    );
  });

  it("requires non-empty progress message", async () => {
    await expect(
      runInference("Test prompt", {}, {
        progressMessage: "   ",
        showProgress: true
      })
    ).rejects.toThrow(text["error_inference_progress_message_required"]!);
    expect(contextGetMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
    expect(stepProgressStartMock).not.toHaveBeenCalled();
  });
});
