import { describe, expect, it } from "vitest";
import { githubRepoNameResolve } from "@/modules/github/githubRepoNameResolve.js";

describe("githubRepoNameResolve", () => {
  it("keeps requested name when missing", async () => {
    const result = await githubRepoNameResolve({
      owner: "ex3ndr",
      requestedRepo: "sample",
      statusGet: async () => "missing"
    });

    expect(result.repo).toBe("sample");
    expect(result.fullName).toBe("ex3ndr/sample");
  });

  it("adds numeric suffix when repository already has content", async () => {
    const statuses = new Map<string, "missing" | "empty" | "nonEmpty">([
      ["ex3ndr/sample", "nonEmpty"],
      ["ex3ndr/sample-2", "nonEmpty"],
      ["ex3ndr/sample-3", "missing"]
    ]);

    const result = await githubRepoNameResolve({
      owner: "ex3ndr",
      requestedRepo: "sample",
      statusGet: async (fullName) => statuses.get(fullName) ?? "missing"
    });

    expect(result.repo).toBe("sample-3");
    expect(result.fullName).toBe("ex3ndr/sample-3");
  });

  it("allows existing empty repository", async () => {
    const result = await githubRepoNameResolve({
      owner: "ex3ndr",
      requestedRepo: "sample",
      statusGet: async () => "empty"
    });

    expect(result.repo).toBe("sample");
    expect(result.status).toBe("empty");
  });
});
