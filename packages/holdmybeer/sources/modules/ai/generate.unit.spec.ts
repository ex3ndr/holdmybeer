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

        expect(onEvent).toHaveBeenCalledWith({
            type: "session_started",
            providerId: "pi",
            sessionId: "session-1"
        });
    });

    it("forwards provider full-state thinking events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "thinking", status: "started", text: "" });
            input.onEvent?.({ type: "thinking", status: "updated", text: "analysis" });
            input.onEvent?.({ type: "thinking", status: "stopped", text: "analysis done" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith({
            type: "thinking",
            providerId: "pi",
            status: "started",
            text: ""
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "thinking",
            providerId: "pi",
            status: "updated",
            text: "analysis"
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "thinking",
            providerId: "pi",
            status: "stopped",
            text: "analysis done"
        });
    });

    it("forwards provider full-state tool call events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({
                type: "tool_call",
                status: "started",
                toolName: "read",
                partialJson: '{"path"'
            });
            input.onEvent?.({
                type: "tool_call",
                status: "stopped",
                toolName: "read",
                arguments: { path: "README.md" },
                partialJson: '{"path":"README.md"}'
            });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith({
            type: "tool_call",
            providerId: "pi",
            status: "started",
            toolName: "read",
            partialJson: '{"path"'
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "tool_call",
            providerId: "pi",
            status: "stopped",
            toolName: "read",
            arguments: { path: "README.md" },
            partialJson: '{"path":"README.md"}'
        });
    });

    it("forwards provider full-state text events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "text", status: "started", text: "" });
            input.onEvent?.({ type: "text", status: "updated", text: "hello" });
            input.onEvent?.({ type: "text", status: "stopped", text: "hello world" });
            return { output: "ok" };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith({
            type: "text",
            providerId: "pi",
            status: "started",
            text: ""
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "text",
            providerId: "pi",
            status: "updated",
            text: "hello"
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "text",
            providerId: "pi",
            status: "stopped",
            text: "hello world"
        });
    });

    it("forwards token usage events", async () => {
        providerGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({
                type: "usage",
                tokens: {
                    input: 10,
                    output: 5,
                    cacheRead: 2,
                    cacheWrite: 0,
                    total: 17
                }
            });
            return { output: "ok", tokenUsage: { input: 10, output: 5, cacheRead: 2, cacheWrite: 0, total: 17 } };
        });

        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await generate(context, "hello", { onEvent });

        expect(onEvent).toHaveBeenCalledWith({
            type: "usage",
            providerId: "pi",
            tokens: {
                input: 10,
                output: 5,
                cacheRead: 2,
                cacheWrite: 0,
                total: 17
            }
        });
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

    it("passes requested sessionId into providerGenerate", async () => {
        providerGenerateMock.mockResolvedValue({ output: "ok", sessionId: "session-2" });

        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
        await generate(context, "hello", { sessionId: "session-2" });

        expect(providerGenerateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: "session-2"
            })
        );
    });
});
