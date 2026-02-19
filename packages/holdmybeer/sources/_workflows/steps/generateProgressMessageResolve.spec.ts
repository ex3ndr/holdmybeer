import { describe, expect, it } from "vitest";
import type { GenerateEvent } from "@/types";
import { generateProgressMessageResolve } from "./generateProgressMessageResolve.js";

describe("generateProgressMessageResolve", () => {
    it("always renders tokens even when an event has no token usage", () => {
        const event: GenerateEvent = {
            type: "provider_status",
            providerId: "pi",
            status: "started"
        };
        const result = generateProgressMessageResolve("Generating", event);
        expect(result).toEqual({
            message: "Generating (starting, tokens 0)",
            tokenCount: 0
        });
    });

    it("keeps token counts monotonic across events", () => {
        const usage: GenerateEvent = {
            type: "usage",
            providerId: "pi",
            tokens: {
                input: 10,
                output: 5,
                cacheRead: 0,
                cacheWrite: 0,
                total: 15
            }
        };
        const lowerText: GenerateEvent = {
            type: "text",
            providerId: "pi",
            status: "updated",
            text: "partial",
            tokens: {
                input: 1,
                output: 1,
                cacheRead: 0,
                cacheWrite: 0,
                total: 2
            }
        };

        const first = generateProgressMessageResolve("Generating", usage);
        const second = generateProgressMessageResolve("Generating", lowerText, first.tokenCount);

        expect(first).toEqual({
            message: "Generating (writing, tokens 15)",
            tokenCount: 15
        });
        expect(second).toEqual({
            message: "Generating (writing, tokens 15)",
            tokenCount: 15
        });
    });
});
