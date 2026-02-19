import { describe, expect, it, vi } from "vitest";
import { treeInferenceProgressRun } from "@/modules/tree/treeInferenceProgressRun.js";
import type { Context, GenerateEvent } from "@/types";

describe("treeInferenceProgressRun", () => {
    it("maps inference events to progress updates", async () => {
        const updates: string[] = [];
        const ctx = {
            progress: async <T>(
                _initialMessage: string,
                operation: (report: (message: string) => void) => Promise<T>
            ): Promise<T> => operation((message) => updates.push(message))
        } as unknown as Context;

        const runMock = vi.fn(async (onEvent: (event: GenerateEvent) => void) => {
            onEvent({
                providerId: "pi",
                type: "thinking",
                status: "started",
                text: "thinking"
            });
            onEvent({
                providerId: "pi",
                type: "usage",
                tokens: {
                    input: 10,
                    output: 5,
                    cacheRead: 0,
                    cacheWrite: 0,
                    total: 15
                }
            });
            return "ok";
        });

        const result = await treeInferenceProgressRun(ctx, "Generating root children...", runMock);

        expect(result).toBe("ok");
        expect(updates.some((entry) => entry.includes("thinking"))).toBe(true);
        expect(updates.some((entry) => entry.includes("tokens 15"))).toBe(true);
    });
});
