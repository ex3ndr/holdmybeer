import { beforeEach, describe, expect, it, vi } from "vitest";

const commandJSONLMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/providers/commandJSONL.js", () => ({
    commandJSONL: commandJSONLMock
}));

import { piProviderGenerate } from "@/modules/ai/providers/piProviderGenerate.js";

describe("piProviderGenerate", () => {
    beforeEach(() => {
        commandJSONLMock.mockReset();
    });

    it("extracts latest assistant message_end text", async () => {
        commandJSONLMock.mockImplementation(async (input) => {
            input.onJsonlEvent?.({
                type: "message_end",
                message: { role: "assistant", content: [{ type: "text", text: "first" }] }
            });
            input.onJsonlEvent?.({
                type: "message_end",
                message: {
                    role: "assistant",
                    content: [
                        { type: "text", text: "second " },
                        { type: "text", text: "message" }
                    ]
                }
            });
            return { exitCode: 0, stdout: "", stderr: "" };
        });

        const result = await piProviderGenerate({
            command: "pi",
            model: "pi-fast",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenCalledWith(
            expect.objectContaining({
                command: "pi",
                args: ["--mode", "json", "--print", "--model", "pi-fast", "hello"],
                timeoutMs: null
            })
        );
        expect(result).toEqual({
            output: "second message",
            exitCode: 0,
            stderr: ""
        });
    });

    it("ignores non-assistant events", async () => {
        commandJSONLMock.mockImplementation(async (input) => {
            input.onJsonlEvent?.({
                type: "message_end",
                message: { role: "user", content: [{ type: "text", text: "nope" }] }
            });
            input.onJsonlEvent?.({ type: "tool_execution_start", toolName: "read" });
            return { exitCode: 0, stdout: "", stderr: "  " };
        });

        const result = await piProviderGenerate({
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(result).toEqual({
            output: null,
            exitCode: 0,
            stderr: ""
        });
    });

    it("forwards raw provider events to callback", async () => {
        commandJSONLMock.mockImplementation(async (input) => {
            input.onJsonlEvent?.({ type: "session", sessionId: "session-1" });
            return { exitCode: 0, stdout: "", stderr: "" };
        });

        const onEvent = vi.fn();
        await piProviderGenerate({
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            onEvent
        });

        expect(onEvent).toHaveBeenCalledWith({ type: "session", sessionId: "session-1" });
    });

    it("uses session dir and continue flag when requested", async () => {
        commandJSONLMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

        await piProviderGenerate({
            command: "pi",
            prompt: "retry",
            sessionDir: "/tmp/pi-session",
            continueSession: true,
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenCalledWith(
            expect.objectContaining({
                args: ["--mode", "json", "--print", "--session-dir", "/tmp/pi-session", "--continue", "retry"]
            })
        );
    });
});
