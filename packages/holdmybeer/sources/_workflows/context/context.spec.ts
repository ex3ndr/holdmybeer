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

import { Context } from "@/_workflows/context/context.js";

describe("Context", () => {
    beforeEach(() => {
        providerDetectMock.mockReset();
        gitStageAndCommitMock.mockReset();
        gitPushMock.mockReset();
        contextAskGithubRepoMock.mockReset();
        contextApplyConfigMock.mockReset();
        contextGitignoreEnsureMock.mockReset();
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
});
