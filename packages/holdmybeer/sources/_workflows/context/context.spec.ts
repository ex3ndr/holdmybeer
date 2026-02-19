import { lstat, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BeerSettings, GitHubRepoRef } from "@/types";

const providerDetectMock = vi.hoisted(() => vi.fn());
const gitStageAndCommitMock = vi.hoisted(() => vi.fn());
const gitPushMock = vi.hoisted(() => vi.fn());
const generateCommitMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/_workflows/steps/generateCommit.js", () => ({
    generateCommit: generateCommitMock
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
        generateCommitMock.mockReset();
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

    it("checkpoints by generating commit message, staging, committing, and pushing", async () => {
        providerDetectMock.mockResolvedValue([]);
        generateCommitMock.mockResolvedValue({ text: "feat: generated message" });
        gitStageAndCommitMock.mockResolvedValue(true);

        const context = await Context.create("/tmp/test-project");
        const result = await context.checkpoint("my hint", { remote: "origin", branch: "main" });

        expect(result).toEqual({ committed: true });
        expect(generateCommitMock).toHaveBeenCalledWith(
            context,
            expect.objectContaining({
                hint: "my hint",
                modelSelectionMode: "sonnet"
            })
        );
        expect(gitStageAndCommitMock).toHaveBeenCalledWith("feat: generated message", "/tmp/test-project");
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

    it("creates and refreshes symlinks", async () => {
        providerDetectMock.mockResolvedValue([]);
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-"));
        try {
            const context = await Context.create(tempDir);
            await context.makeSymlink(".context", "ctx");
            await context.makeSymlink(".context", "ctx");

            const symlinkPath = path.join(tempDir, "ctx");
            const symlinkStat = await lstat(symlinkPath);
            expect(symlinkStat.isSymbolicLink()).toBe(true);
            expect(await readlink(symlinkPath)).toBe(".context");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("fails makeSymlink when link path is not a symlink", async () => {
        providerDetectMock.mockResolvedValue([]);
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-context-"));
        try {
            const context = await Context.create(tempDir);
            await writeFile(path.join(tempDir, "ctx"), "occupied", "utf-8");

            await expect(context.makeSymlink(".context", "ctx")).rejects.toMatchObject({
                code: "EEXIST"
            });
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
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
