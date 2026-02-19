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
      permissions.onEvent?.("provider=pi started");
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
      "Generating test output (PI started)"
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

  it("humanizes provider event labels for loader updates", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=turn_start");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).toHaveBeenCalledWith(
      "Generating README.md (PI turn started)"
    );
  });

  it("humanizes provider message events with role details", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    const progress = { update: vi.fn(), done: vi.fn(), fail: vi.fn() };
    contextGetMock.mockReturnValue(context);
    stepProgressStartMock.mockReturnValue(progress);
    generateMock.mockImplementation(async (_ctx, _prompt, permissions) => {
      permissions.onEvent?.("provider=pi event=message_start role=assistant");
      return { provider: "pi", text: "done" };
    });

    await runInference("Prompt", {}, {
      progressMessage: "Generating README.md",
      showProgress: true
    });

    expect(progress.update).toHaveBeenCalledWith(
      "Generating README.md (PI assistant message started)"
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
