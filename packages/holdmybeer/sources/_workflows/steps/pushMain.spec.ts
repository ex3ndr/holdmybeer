import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const contextGetMock = vi.hoisted(() => vi.fn());
const gitPushMock = vi.hoisted(() => vi.fn());
const gitignoreEnsureMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/context/contextGet.js", () => ({
  contextGet: contextGetMock
}));

vi.mock("@/modules/git/gitPush.js", () => ({
  gitPush: gitPushMock
}));

vi.mock("@/modules/git/gitignoreEnsure.js", () => ({
  gitignoreEnsure: gitignoreEnsureMock
}));

import { pushMain } from "@/_workflows/steps/pushMain.js";

describe("pushMain", () => {
  beforeEach(() => {
    contextGetMock.mockReset();
    gitPushMock.mockReset();
    gitignoreEnsureMock.mockReset();
  });

  it("ensures gitignore, commits staged files, and pushes", async () => {
    const stageAndCommit = vi.fn().mockResolvedValue(true);
    const context = {
      projectPath: "/tmp/project",
      providers: [],
      inferText: vi.fn(),
      stageAndCommit
    } as unknown as Context;
    contextGetMock.mockReturnValue(context);
    gitignoreEnsureMock.mockResolvedValue(undefined);
    gitPushMock.mockResolvedValue(undefined);

    const result = await pushMain("feat: initial bootstrap", { showProgress: true });

    expect(result).toEqual({ committed: true });
    expect(gitignoreEnsureMock).toHaveBeenCalledWith("/tmp/project");
    expect(stageAndCommit).toHaveBeenCalledWith("feat: initial bootstrap");
    expect(gitPushMock).toHaveBeenCalledWith("origin", "main", "/tmp/project");
  });
});
