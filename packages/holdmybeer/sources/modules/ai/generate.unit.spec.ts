import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const providerPriorityListMock = vi.hoisted(() => vi.fn());
const providerModelSelectMock = vi.hoisted(() => vi.fn());
const sandboxInferenceGetMock = vi.hoisted(() => vi.fn());
const providerGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/providers/providerPriorityList.js", () => ({
    providerPriorityList: providerPriorityListMock
}));

vi.mock("@/modules/providers/providerModelSelect.js", () => ({
    providerModelSelect: providerModelSelectMock
}));

vi.mock("@/modules/sandbox/sandboxInferenceGet.js", () => ({
    sandboxInferenceGet: sandboxInferenceGetMock
}));

vi.mock("@/modules/ai/providerGenerate.js", () => ({
    providerGenerate: providerGenerateMock
}));

import { generate } from "@/modules/ai/generate.js";

describe("generate event parsing", () => {
    beforeEach(() => {
        providerPriorityListMock.mockReset();
        providerModelSelectMock.mockReset();
        sandboxInferenceGetMock.mockReset();
        providerGenerateMock.mockReset();

        providerPriorityListMock.mockReturnValue([{ id: "pi", command: "pi" }]);
        providerModelSelectMock.mockReturnValue(undefined);
        sandboxInferenceGetMock.mockResolvedValue({ wrapCommand: async (command: string) => command });
    });

    it("forwards provider session_started event", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "session_started", sessionId: "session-1" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=session_started session=session-1");
    });

    it("forwards provider thinking start/delta/stop events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "thinking_start" });
            input.onEvent?.({ type: "thinking_delta", delta: "analysis" });
            input.onEvent?.({ type: "thinking_stop" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=thinking_start");
        expect(onEvent).toHaveBeenCalledWith("provider=pi event=thinking_delta");
        expect(onEvent).toHaveBeenCalledWith("provider=pi event=thinking_stop");
    });

    it("forwards provider tool call start/stop events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "tool_call_start", toolName: "read" });
            input.onEvent?.({ type: "tool_call_stop", toolName: "read" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=tool_call_start tool=read");
        expect(onEvent).toHaveBeenCalledWith("provider=pi event=tool_call_stop tool=read");
    });

    it("forwards provider text start/delta/stop events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "text_start" });
            input.onEvent?.({ type: "text_delta", delta: "hello" });
            input.onEvent?.({ type: "text_stop" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=text_start");
        expect(onEvent).toHaveBeenCalledWith("provider=pi event=text_delta");
        expect(onEvent).toHaveBeenCalledWith("provider=pi event=text_stop");
    });

    it("returns sessionId from providerGenerate result", async () => {
        providerGenerateMock.mockResolvedValue({ output: "ok", sessionId: "session-1" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        const result = await generate(context, "hello");

        expect(result).toEqual({
            provider: "pi",
            sessionId: "session-1",
            text: "ok"
        });
    });
});
