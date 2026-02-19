import { beforeEach, describe, expect, it, vi } from "vitest";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

import { gitRepoEnsure } from "@/modules/git/gitRepoEnsure.js";

describe("gitRepoEnsure", () => {
  beforeEach(() => {
    commandRunMock.mockReset();
  });

  it("does nothing when directory is already a git repository", async () => {
    commandRunMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "true\n",
      stderr: ""
    });

    await gitRepoEnsure("/tmp/project");

    expect(commandRunMock).toHaveBeenCalledTimes(1);
    expect(commandRunMock).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: "/tmp/project", allowFailure: true }
    );
  });

  it("initializes git when directory is not a repository", async () => {
    commandRunMock
      .mockResolvedValueOnce({
        exitCode: 128,
        stdout: "",
        stderr: "fatal: not a git repository"
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "Initialized empty Git repository\n",
        stderr: ""
      });

    await gitRepoEnsure("/tmp/project");

    expect(commandRunMock).toHaveBeenCalledTimes(2);
    expect(commandRunMock).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: "/tmp/project", allowFailure: true }
    );
    expect(commandRunMock).toHaveBeenNthCalledWith(
      2,
      "git",
      ["init"],
      { cwd: "/tmp/project" }
    );
  });
});
