import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("./generate.js", () => ({
    generate: generateMock
}));

import { generateText } from "@/modules/ai/generateText.js";

describe("generateText", () => {
    beforeEach(() => {
        generateMock.mockReset();
    });

    it("forwards to generate with text expected output", async () => {
        const context = { projectPath: "/tmp/test-project", providers: [] } as unknown as Context;
        generateMock.mockResolvedValue({ provider: "pi", sessionId: "session-1", text: "ok" });

        const result = await generateText(context, "hello", {
            providerPriority: ["pi"],
            showProgress: true,
            writePolicy: { mode: "read-only" }
        });

        expect(result).toEqual({ provider: "pi", sessionId: "session-1", text: "ok" });
        expect(generateMock).toHaveBeenCalledWith(context, "hello", {
            providerPriority: ["pi"],
            showProgress: true,
            writePolicy: { mode: "read-only" },
            expectedOutput: { type: "text" }
        });
    });
});
