import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { beerSettingsPathResolve } from "@/modules/beer/beerSettingsPathResolve.js";

describe("beerSettingsPathResolve", () => {
  it("resolves settings path under the HoldMyBeerDev folder", () => {
    expect(beerSettingsPathResolve()).toBe(
      path.join(os.homedir(), "Developer", "HoldMyBeerDev", ".beer", "settings.json")
    );
  });
});
