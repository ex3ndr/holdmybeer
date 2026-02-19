import { beforeEach, describe, expect, it, vi } from "vitest";

const promptInputMock = vi.hoisted(() => vi.fn());
const githubRepoParseMock = vi.hoisted(() => vi.fn());
const githubRepoExistsMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/prompt/promptInput.js", () => ({
    promptInput: promptInputMock
}));

vi.mock("@/modules/github/githubRepoParse.js", () => ({
    githubRepoParse: githubRepoParseMock
}));

vi.mock("@/modules/github/githubRepoExists.js", () => ({
    githubRepoExists: githubRepoExistsMock
}));

import { contextAskGithubRepo } from "@/_workflows/context/utils/contextAskGithubRepo.js";

describe("contextAskGithubRepo", () => {
    beforeEach(() => {
        promptInputMock.mockReset();
        githubRepoParseMock.mockReset();
        githubRepoExistsMock.mockReset();
    });

    it("re-prompts until a valid existing repository is provided", async () => {
        promptInputMock.mockResolvedValueOnce("bad").mockResolvedValueOnce("owner/repo");
        githubRepoParseMock.mockReturnValueOnce(null).mockReturnValueOnce({
            owner: "owner",
            repo: "repo",
            fullName: "owner/repo",
            url: "https://github.com/owner/repo"
        });
        githubRepoExistsMock.mockResolvedValueOnce(true);

        const result = await contextAskGithubRepo("Repo?");

        expect(result.fullName).toBe("owner/repo");
        expect(promptInputMock).toHaveBeenCalledTimes(2);
        expect(githubRepoExistsMock).toHaveBeenCalledWith("owner/repo");
    });
});
