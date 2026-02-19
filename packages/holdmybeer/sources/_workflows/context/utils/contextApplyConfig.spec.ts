import { describe, expect, it, vi } from "vitest";
import type { BeerSettings } from "@/types";

const beerSettingsWriteMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/beer/beerSettingsWrite.js", () => ({
    beerSettingsWrite: beerSettingsWriteMock
}));

import { contextApplyConfig } from "@/_workflows/context/utils/contextApplyConfig.js";

describe("contextApplyConfig", () => {
    it("applies update, persists with refreshed timestamp, and keeps input immutable", async () => {
        const current: Readonly<BeerSettings> = {
            version: 1,
            updatedAt: 1
        };

        const result = await contextApplyConfig("/tmp/project", current, (settings) => {
            settings.sourceCommitHash = "abc123";
        });

        expect(result.sourceCommitHash).toBe("abc123");
        expect(result.updatedAt).toBeGreaterThan(1);
        expect(current.sourceCommitHash).toBeUndefined();
        expect(beerSettingsWriteMock).toHaveBeenCalledWith(
            "/tmp/project/.beer/settings.json",
            expect.objectContaining({
                sourceCommitHash: "abc123"
            })
        );
    });
});
