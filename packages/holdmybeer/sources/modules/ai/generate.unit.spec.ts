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

    it("unwraps message_update envelope for text_delta", async () => {
        const event = JSON.stringify({
            type: "message_update",
            assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "Hello" }
        });
        providerGenerateMock.mockImplementation(async (input) => {
            input.onStdoutText?.(`${event}\n`);
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=text_delta");
    });

    it("unwraps message_update envelope for toolcall_start with tool name", async () => {
        const event = JSON.stringify({
            type: "message_update",
            assistantMessageEvent: {
                type: "toolcall_start",
                contentIndex: 0,
                partial: {
                    role: "assistant",
                    content: [{ type: "toolCall", name: "Read", id: "t1", arguments: {} }]
                }
            }
        });
        providerGenerateMock.mockImplementation(async (input) => {
            input.onStdoutText?.(`${event}\n`);
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=toolcall_start tool=Read");
    });

    it("parses tool_execution_start with tool name", async () => {
        const event = JSON.stringify({
            type: "tool_execution_start",
            toolCallId: "toolu_123",
            toolName: "read"
        });
        providerGenerateMock.mockImplementation(async (input) => {
            input.onStdoutText?.(`${event}\n`);
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=tool_execution_start tool=read");
    });

    it("parses direct turn_start event", async () => {
        const event = JSON.stringify({ type: "turn_start" });
        providerGenerateMock.mockImplementation(async (input) => {
            input.onStdoutText?.(`${event}\n`);
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith("provider=pi event=turn_start");
    });
});
