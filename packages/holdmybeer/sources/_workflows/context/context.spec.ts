import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BeerSettings, GitHubRepoRef } from "@/types";

const providerDetectMock = vi.hoisted(() => vi.fn());
const gitStageAndCommitMock = vi.hoisted(() => vi.fn());
const gitPushMock = vi.hoisted(() => vi.fn());
const contextAskGithubRepoMock = vi.hoisted(() => vi.fn());
const contextApplyConfigMock = vi.hoisted(() => vi.fn());
const contextGitignoreEnsureMock = vi.hoisted(() => vi.fn());
const progressMultilineStartMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/providers/providerDetect.js", () => ({
    providerDetect: providerDetectMock
}));

vi.mock("@/modules/git/gitStageAndCommit.js", () => ({
    gitStageAndCommit: gitStageAndCommitMock
}));

vi.mock("@/modules/git/gitPush.js", () => ({
    gitPush: gitPushMock
}));

vi.mock("@/_workflows/context/utils/contextAskGithubRepo.js", () => ({
    contextAskGithubRepo: contextAskGithubRepoMock
}));

vi.mock("@/_workflows/context/utils/contextApplyConfig.js", () => ({
    contextApplyConfig: contextApplyConfigMock
}));

vi.mock("@/_workflows/context/utils/contextGitignoreEnsure.js", () => ({
    contextGitignoreEnsure: contextGitignoreEnsureMock
}));

vi.mock("@/_workflows/context/utils/progressMultilineStart.js", () => ({
    progressMultilineStart: progressMultilineStartMock
}));

import { Context } from "@/_workflows/context/context.js";

describe("Context", () => {
    beforeEach(() => {
        providerDetectMock.mockReset();
        gitStageAndCommitMock.mockReset();
        gitPushMock.mockReset();
        contextAskGithubRepoMock.mockReset();
        contextApplyConfigMock.mockReset();
        contextGitignoreEnsureMock.mockReset();
        progressMultilineStartMock.mockReset();
    });

    it("creates context with folder and detected providers", async () => {
        providerDetectMock.mockResolvedValue([{ id: "pi", available: true, command: "pi", priority: 1 }]);

        const context = await Context.create("/tmp/test-project");

        expect(context.projectPath).toBe("/tmp/test-project");
        expect(context.providers).toEqual([{ id: "pi", available: true, command: "pi", priority: 1 }]);
    });

    it("checkpoints by staging, committing, and pushing", async () => {
        providerDetectMock.mockResolvedValue([]);
        gitStageAndCommitMock.mockResolvedValue(true);

        const context = await Context.create("/tmp/test-project");
        const result = await context.checkpoint("feat: checkpoint", { remote: "origin", branch: "main" });

        expect(result).toEqual({ committed: true });
        expect(gitStageAndCommitMock).toHaveBeenCalledWith("feat: checkpoint", "/tmp/test-project");
        expect(gitPushMock).toHaveBeenCalledWith("origin", "main", "/tmp/test-project");
    });

    it("delegates askGithubRepo, applyConfig, and gitignore helpers", async () => {
        providerDetectMock.mockResolvedValue([]);
        const repo: GitHubRepoRef = {
            owner: "owner",
            repo: "repo",
            fullName: "owner/repo",
            url: "https://github.com/owner/repo"
        };
        const settings: BeerSettings = {
            version: 1,
            sourceRepo: repo,
            updatedAt: Date.now()
        };
        contextAskGithubRepoMock.mockResolvedValue(repo);
        contextApplyConfigMock.mockResolvedValue(settings);

        const context = await Context.create("/tmp/test-project");
        const asked = await context.askGithubRepo("Repo?");
        await context.applyConfig(() => {});
        await context.gitignore([".beer/local/"]);

        expect(asked).toEqual(repo);
        expect(context.settings).toEqual(settings);
        expect(contextAskGithubRepoMock).toHaveBeenCalledWith("Repo?", undefined);
        expect(contextApplyConfigMock).toHaveBeenCalledWith(
            "/tmp/test-project",
            expect.objectContaining({ version: 1 }),
            expect.any(Function)
        );
        expect(contextGitignoreEnsureMock).toHaveBeenCalledWith("/tmp/test-project", [".beer/local/"]);
    });

    it("writes files and checks file/dir existence", async () => {
        providerDetectMock.mockResolvedValue([]);
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-"));
        try {
            const context = await Context.create(tempDir);

            expect(await context.existDir("tmp")).toBe(false);
            await context.makeDirs("tmp");
            expect(await context.existDir("tmp")).toBe(true);
            expect(await context.existFile("tmp/out.txt")).toBe(false);

            await context.writeFile("tmp/out.txt", "hello");
            expect(await context.existFile("tmp/out.txt")).toBe(true);

            const text = await readFile(path.join(tempDir, "tmp/out.txt"), "utf-8");
            expect(text).toBe("hello");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("runs dynamic multiline progress lines and stops spinner state", async () => {
        providerDetectMock.mockResolvedValue([]);
        const lineA = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const lineB = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const addMock = vi.fn().mockReturnValueOnce(lineA).mockReturnValueOnce(lineB);
        const doneRunningMock = vi.fn();
        const failRunningMock = vi.fn();
        const stopMock = vi.fn();
        progressMultilineStartMock.mockReturnValue({
            add: addMock,
            doneRunning: doneRunningMock,
            failRunning: failRunningMock,
            stop: stopMock
        });

        const context = await Context.create("/tmp/test-project");
        const result = await context.progresses(async (progresses) => {
            const first = progresses.run("task A", async (report) => {
                report("task A update");
                return "A";
            });
            const second = progresses.run("task B", async () => "B");
            return Promise.all([first, second]);
        });

        expect(result).toEqual(["A", "B"]);
        expect(addMock).toHaveBeenCalledWith("task A");
        expect(addMock).toHaveBeenCalledWith("task B");
        expect(lineA.update).toHaveBeenCalledWith("task A update");
        expect(lineA.done).toHaveBeenCalledWith("A");
        expect(lineB.done).toHaveBeenCalledWith("B");
        expect(lineA.fail).not.toHaveBeenCalled();
        expect(lineB.fail).not.toHaveBeenCalled();
        expect(doneRunningMock).not.toHaveBeenCalled();
        expect(failRunningMock).not.toHaveBeenCalled();
        expect(stopMock).toHaveBeenCalledTimes(1);
    });

    it("fails running multiline progress lines when operation throws", async () => {
        providerDetectMock.mockResolvedValue([]);
        const line = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const addMock = vi.fn().mockReturnValue(line);
        const doneRunningMock = vi.fn();
        const failRunningMock = vi.fn();
        const stopMock = vi.fn();
        progressMultilineStartMock.mockReturnValue({
            add: addMock,
            doneRunning: doneRunningMock,
            failRunning: failRunningMock,
            stop: stopMock
        });

        const context = await Context.create("/tmp/test-project");
        await expect(
            context.progresses(async (progresses) => {
                await progresses.run("task A", async () => {
                    throw new Error("boom");
                });
            })
        ).rejects.toThrow("boom");

        expect(addMock).toHaveBeenCalledWith("task A");
        expect(line.done).not.toHaveBeenCalled();
        expect(line.fail).toHaveBeenCalledWith("boom");
        expect(doneRunningMock).not.toHaveBeenCalled();
        expect(failRunningMock).not.toHaveBeenCalled();
        expect(stopMock).toHaveBeenCalledTimes(1);
    });

    it("stacks progress lines across concurrent progress calls", async () => {
        providerDetectMock.mockResolvedValue([]);
        const lineA = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const lineB = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const addMock = vi.fn().mockReturnValueOnce(lineA).mockReturnValueOnce(lineB);
        const stopMock = vi.fn();
        progressMultilineStartMock.mockReturnValue({
            add: addMock,
            doneRunning: vi.fn(),
            failRunning: vi.fn(),
            stop: stopMock
        });

        const context = await Context.create("/tmp/test-project");
        const [first, second] = await Promise.all([
            context.progress("task A", async () => "task A done"),
            context.progress("task B", async () => "task B done")
        ]);

        expect(first).toBe("task A done");
        expect(second).toBe("task B done");
        expect(progressMultilineStartMock).toHaveBeenCalledTimes(1);
        expect(addMock).toHaveBeenCalledWith("task A");
        expect(addMock).toHaveBeenCalledWith("task B");
        expect(lineA.done).toHaveBeenCalledWith("task A done");
        expect(lineB.done).toHaveBeenCalledWith("task B done");
        expect(lineA.fail).not.toHaveBeenCalled();
        expect(lineB.fail).not.toHaveBeenCalled();
        expect(stopMock).toHaveBeenCalledTimes(1);
    });

    it("uses thrown error message for failed progress lines", async () => {
        providerDetectMock.mockResolvedValue([]);
        const line = {
            update: vi.fn(),
            done: vi.fn(),
            fail: vi.fn()
        };
        const addMock = vi.fn().mockReturnValue(line);
        const stopMock = vi.fn();
        progressMultilineStartMock.mockReturnValue({
            add: addMock,
            doneRunning: vi.fn(),
            failRunning: vi.fn(),
            stop: stopMock
        });

        const context = await Context.create("/tmp/test-project");
        await expect(
            context.progress("task A", async () => {
                throw new Error("task failed");
            })
        ).rejects.toThrow("task failed");

        expect(addMock).toHaveBeenCalledWith("task A");
        expect(line.done).not.toHaveBeenCalled();
        expect(line.fail).toHaveBeenCalledWith("task failed");
        expect(stopMock).toHaveBeenCalledTimes(1);
    });
});
