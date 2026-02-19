import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generatePureTextMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generatePureText.js", () => ({
    generatePureText: generatePureTextMock
}));

import { generatePureSessionCreate } from "@/modules/ai/generatePureSessionCreate.js";

describe("generatePureSessionCreate", () => {
    beforeEach(() => {
        generatePureTextMock.mockReset();
    });

    it("stores returned session id and reuses it on next pure generate call", async () => {
        generatePureTextMock
            .mockResolvedValueOnce({ provider: "pi", sessionId: "pure-1", text: "first" })
            .mockResolvedValueOnce({ provider: "pi", sessionId: "pure-1", text: "second" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        const session = generatePureSessionCreate(context);

        await session.generate("first prompt");
        await session.generate("second prompt");

        expect(generatePureTextMock).toHaveBeenNthCalledWith(1, context, "first prompt", {
            sessionId: undefined
        });
        expect(generatePureTextMock).toHaveBeenNthCalledWith(2, context, "second prompt", {
            sessionId: "pure-1"
        });
        expect(session.sessionId).toBe("pure-1");
    });

    it("starts from an existing session id for pure resume", async () => {
        generatePureTextMock.mockResolvedValue({ provider: "pi", sessionId: "pure-2", text: "resumed" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        const session = generatePureSessionCreate(context, { sessionId: "pure-2" });

        await session.generate("continue");

        expect(generatePureTextMock).toHaveBeenCalledWith(context, "continue", {
            sessionId: "pure-2"
        });
        expect(session.sessionId).toBe("pure-2");
    });
});
