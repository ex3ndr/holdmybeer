import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generate.js", () => ({
    generate: generateMock
}));

import { generateSessionCreate } from "@/modules/ai/generateSessionCreate.js";

describe("generateSessionCreate", () => {
    beforeEach(() => {
        generateMock.mockReset();
    });

    it("stores returned session id and reuses it on next generate call", async () => {
        generateMock
            .mockResolvedValueOnce({ provider: "pi", sessionId: "session-1", text: "first" })
            .mockResolvedValueOnce({ provider: "pi", sessionId: "session-1", text: "second" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        const session = generateSessionCreate(context);

        await session.generate("first prompt");
        await session.generate("second prompt");

        expect(generateMock).toHaveBeenNthCalledWith(1, context, "first prompt", {
            sessionId: undefined
        });
        expect(generateMock).toHaveBeenNthCalledWith(2, context, "second prompt", {
            sessionId: "session-1"
        });
        expect(session.sessionId).toBe("session-1");
    });

    it("starts from an existing session id for resume", async () => {
        generateMock.mockResolvedValue({ provider: "pi", sessionId: "session-2", text: "resumed" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        const session = generateSessionCreate(context, { sessionId: "session-2" });

        await session.generate("continue");

        expect(generateMock).toHaveBeenCalledWith(context, "continue", {
            sessionId: "session-2"
        });
        expect(session.sessionId).toBe("session-2");
    });
});
