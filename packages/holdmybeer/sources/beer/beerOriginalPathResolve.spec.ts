import { describe, expect, it } from "vitest";
import path from "node:path";
import { beerOriginalPathResolve } from "./beerOriginalPathResolve.js";

describe("beerOriginalPathResolve", () => {
  it("resolves to .beer/original under invocation cwd", () => {
    const baseDir = process.env.INIT_CWD ?? process.cwd();
    expect(beerOriginalPathResolve()).toBe(path.join(baseDir, ".beer", "original"));
  });
});
