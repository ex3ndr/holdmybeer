import { describe, expect, it } from "vitest";
import path from "node:path";
import { beerOriginalPathResolve } from "@/modules/beer/beerOriginalPathResolve.js";

describe("beerOriginalPathResolve", () => {
  it("resolves to .beer/original under the provided project path", () => {
    const projectPath = "/tmp/test-project";
    expect(beerOriginalPathResolve(projectPath)).toBe(path.join(projectPath, ".beer", "original"));
  });
});
