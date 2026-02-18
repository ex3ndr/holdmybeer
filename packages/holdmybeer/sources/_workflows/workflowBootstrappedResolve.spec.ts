import { beforeEach, describe, expect, it, vi } from "vitest";

const beerSettingsPathResolveMock = vi.hoisted(() => vi.fn());
const beerSettingsReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/beer/beerSettingsPathResolve.js", () => ({
  beerSettingsPathResolve: beerSettingsPathResolveMock
}));

vi.mock("@/modules/beer/beerSettingsRead.js", () => ({
  beerSettingsRead: beerSettingsReadMock
}));

import { workflowBootstrappedResolve } from "@/_workflows/workflowBootstrappedResolve.js";

describe("workflowBootstrappedResolve", () => {
  beforeEach(() => {
    beerSettingsPathResolveMock.mockReset();
    beerSettingsReadMock.mockReset();
    beerSettingsPathResolveMock.mockReturnValue("/tmp/settings.json");
  });

  it("returns true when source/publish/hash are present", async () => {
    beerSettingsReadMock.mockResolvedValue({
      version: 1,
      providers: [],
      sourceRepo: { owner: "a", repo: "b", fullName: "a/b", url: "https://github.com/a/b" },
      publishRepo: { owner: "c", repo: "d", fullName: "c/d", url: "https://github.com/c/d" },
      sourceCommitHash: "abc",
      updatedAt: Date.now()
    });

    await expect(workflowBootstrappedResolve()).resolves.toBe(true);
    expect(beerSettingsReadMock).toHaveBeenCalledWith("/tmp/settings.json");
  });

  it("returns false when publish repo or hash is missing", async () => {
    beerSettingsReadMock.mockResolvedValue({
      version: 1,
      providers: [],
      sourceRepo: { owner: "a", repo: "b", fullName: "a/b", url: "https://github.com/a/b" },
      updatedAt: Date.now()
    });

    await expect(workflowBootstrappedResolve()).resolves.toBe(false);
  });
});
