import { describe, expect, it } from "vitest";
import type { Context } from "@/types";
import { ralphPlanPathResolve } from "./ralphPlanPathResolve.js";

describe("ralphPlanPathResolve", () => {
    const context = {} as Context;
    const nowMs = Date.UTC(2026, 1, 14, 9, 30, 0);

    it("slugifies special characters and lowercases words", () => {
        const path = ralphPlanPathResolve(context, "Fix API: OAuth + SSO!!!", nowMs);
        expect(path).toBe("doc/plans/20260214-fix-api-oauth-sso.md");
    });

    it("falls back to task slug when input has no slug chars", () => {
        const path = ralphPlanPathResolve(context, "!!!   ???", nowMs);
        expect(path).toBe("doc/plans/20260214-task.md");
    });

    it("trims long slugs to 48 characters", () => {
        const path = ralphPlanPathResolve(
            context,
            "This is a very long goal to verify deterministic truncation of the generated slug value",
            nowMs
        );
        expect(path).toBe("doc/plans/20260214-this-is-a-very-long-goal-to-verify-deterministic.md");
    });
});
