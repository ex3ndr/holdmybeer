import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";

describe("beerSettingsRead", () => {
    it("ignores legacy providers field from settings.json", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-settings-read-"));
        try {
            const settingsPath = path.join(tempDir, "settings.json");
            await writeFile(
                settingsPath,
                JSON.stringify({
                    version: 1,
                    providers: [{ id: "pi" }],
                    sourceCommitHash: "abc123",
                    updatedAt: 1
                }),
                "utf-8"
            );

            const settings = await beerSettingsRead(settingsPath);

            expect(settings.sourceCommitHash).toBe("abc123");
            expect("providers" in settings).toBe(false);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
