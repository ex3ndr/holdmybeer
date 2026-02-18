import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { beerDevFolderResolve } from "@/modules/beer/beerDevFolderResolve.js";

describe("beerDevFolderResolve", () => {
  it("resolves to ~/Developer/HoldMyBeerDev", () => {
    expect(beerDevFolderResolve()).toBe(path.join(os.homedir(), "Developer", "HoldMyBeerDev"));
  });
});
