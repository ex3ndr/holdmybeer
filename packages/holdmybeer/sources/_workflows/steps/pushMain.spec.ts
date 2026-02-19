import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const contextGetMock = vi.hoisted(() => vi.fn());
const generateFileMock = vi.hoisted(() => vi.fn());
const gitPushMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/context/contextGet.js", () => ({
  contextGet: contextGetMock
}));

vi.mock("@/modules/ai/generateFile.js", () => ({
  generateFile: generateFileMock
}));

vi.mock("@/modules/git/gitPush.js", () => ({
  gitPush: gitPushMock
}));

import { pushMain } from "@/_workflows/steps/pushMain.js";

describe("pushMain", () => {
  beforeEach(() => {
    contextGetMock.mockReset();
    generateFileMock.mockReset();
    gitPushMock.mockReset();
  });

  it("updates gitignore, commits staged files, and pushes", async () => {
    const stageAndCommit = vi.fn().mockResolvedValue(true);
    const context = {
      projectPath: "/tmp/project",
      providers: [],
      inferText: vi.fn(),
      stageAndCommit
    } as unknown as Context;
    contextGetMock.mockReturnValue(context);
    generateFileMock.mockResolvedValue({ provider: "pi", text: "ok" });
    gitPushMock.mockResolvedValue(undefined);

    const result = await pushMain("feat: initial bootstrap", { showProgress: true });

    expect(result).toEqual({ committed: true, provider: "pi" });
    expect(generateFileMock).toHaveBeenCalledWith(
      context,
      expect.stringContaining("garbage"),
      ".gitignore",
      {
        showProgress: true,
        modelSelectionMode: "codex-xhigh",
        retries: 1
      }
    );
    expect(stageAndCommit).toHaveBeenCalledWith("feat: initial bootstrap");
    expect(gitPushMock).toHaveBeenCalledWith("origin", "main", "/tmp/project");
  });
});
