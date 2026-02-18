import { describe, expect, it } from "vitest";
import { ralphLoopPlanPathResolve } from "@/_workflows/steps/ralphLoopPlanPathResolve.js";

describe("ralphLoopPlanPathResolve", () => {
  it("creates dated slugged path from build goal", () => {
    const result = ralphLoopPlanPathResolve(
      "Add API caching + invalidation",
      Date.UTC(2026, 1, 18)
    );
    expect(result).toBe("doc/plans/20260218-add-api-caching-invalidation.md");
  });

  it("falls back to task slug for empty input", () => {
    const result = ralphLoopPlanPathResolve("   ", Date.UTC(2026, 1, 18));
    expect(result).toBe("doc/plans/20260218-task.md");
  });
});
