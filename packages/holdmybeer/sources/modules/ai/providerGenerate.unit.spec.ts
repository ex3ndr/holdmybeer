import { beforeEach, describe, expect, it, vi } from "vitest";

const piProviderGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/providers/piProviderGenerate.js", () => ({
    piProviderGenerate: piProviderGenerateMock
}));

import { providerGenerate } from "@/modules/ai/providerGenerate.js";

describe("providerGenerate", () => {
    beforeEach(() => {
        piProviderGenerateMock.mockReset();
    });

    it("fails text mode when pi json output has no assistant message", async () => {
        piProviderGenerateMock.mockResolvedValue({
            exitCode: 0,
            stderr: "",
            output: null
        });

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(piProviderGenerateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                command: "pi",
                prompt: "hello"
            })
        );
        expect(result).toEqual({
            output: null,
            sessionId: undefined,
            failure: {
                providerId: "pi",
                exitCode: 1,
                stderr: "Provider returned no JSON assistant output."
            }
        });
    });

    it("allows empty assistant text in file mode", async () => {
        piProviderGenerateMock.mockResolvedValue({
            exitCode: 0,
            stderr: "",
            output: null
        });

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "write file",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false
        });

        expect(result).toEqual({ output: "", sessionId: undefined });
    });

    it("converts pi session event to common session_started", async () => {
        piProviderGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "session", sessionId: "session-1" });
            return { exitCode: 0, stderr: "", output: "ok" };
        });

        const onEvent = vi.fn();
        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false,
            onEvent
        });

        expect(result).toEqual({ output: "ok", sessionId: "session-1" });
        expect(onEvent).toHaveBeenCalledWith({ type: "session_started", sessionId: "session-1" });
    });

    it("converts pi stream events to common thinking/tool/text events", async () => {
        piProviderGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({ type: "message_update", assistantMessageEvent: { type: "thinking_start" } });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "thinking_delta", delta: "analyze" }
            });
            input.onEvent?.({ type: "message_update", assistantMessageEvent: { type: "thinking_end" } });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: {
                    type: "toolcall_start",
                    partial: { content: [{ name: "Read" }] },
                    contentIndex: 0
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "toolcall_end", toolCall: { name: "Read" } }
            });
            input.onEvent?.({ type: "message_update", assistantMessageEvent: { type: "text_start" } });
            input.onEvent?.({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "hello" } });
            input.onEvent?.({ type: "message_update", assistantMessageEvent: { type: "text_end" } });
            return { exitCode: 0, stderr: "", output: "ok" };
        });

        const onEvent = vi.fn();
        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false,
            onEvent
        });

        expect(result).toEqual({ output: "ok", sessionId: undefined });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking_start" });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking_delta", delta: "analyze" });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking_stop" });
        expect(onEvent).toHaveBeenCalledWith({ type: "tool_call_start", toolName: "Read" });
        expect(onEvent).toHaveBeenCalledWith({ type: "tool_call_stop", toolName: "Read" });
        expect(onEvent).toHaveBeenCalledWith({ type: "text_start" });
        expect(onEvent).toHaveBeenCalledWith({ type: "text_delta", delta: "hello" });
        expect(onEvent).toHaveBeenCalledWith({ type: "text_stop" });
    });

    it("retries by continuing existing session with error message", async () => {
        piProviderGenerateMock
            .mockResolvedValueOnce({
                exitCode: 0,
                stderr: "",
                output: "missing tags"
            })
            .mockResolvedValueOnce({
                exitCode: 0,
                stderr: "",
                output: "<output>ok</output>"
            });

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(result).toEqual({ output: "ok", sessionId: undefined });

        const firstCall = piProviderGenerateMock.mock.calls[0]?.[0] as
            | { prompt?: string; continueSession?: boolean; sessionDir?: string }
            | undefined;
        const secondCall = piProviderGenerateMock.mock.calls[1]?.[0] as
            | { prompt?: string; continueSession?: boolean; sessionDir?: string }
            | undefined;

        expect(firstCall?.prompt).toBe("hello");
        expect(firstCall?.continueSession).toBe(false);
        expect(firstCall?.sessionDir).toBeTruthy();

        expect(secondCall?.prompt).toContain("Error:");
        expect(secondCall?.prompt).toContain("<output>");
        expect(secondCall?.continueSession).toBe(true);
        expect(secondCall?.sessionDir).toBe(firstCall?.sessionDir);
    });
});
