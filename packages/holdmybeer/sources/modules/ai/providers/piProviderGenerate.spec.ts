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

    it("uses session id when requested", async () => {
        commandJSONLMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

        await piProviderGenerate({
            command: "pi",
            prompt: "retry",
            sessionId: "session-123",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenCalledWith(
            expect.objectContaining({
                args: ["--mode", "json", "--print", "--session", "session-123", "retry"]
            })
        );
    });

    it("starts fresh when no session id is provided", async () => {
        commandJSONLMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

        await piProviderGenerate({
            command: "pi",
            prompt: "retry",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenCalledWith(
            expect.objectContaining({
                args: ["--mode", "json", "--print", "retry"]
            })
        );
    });

    it("adds no-tools flags when pure mode is enabled", async () => {
        commandJSONLMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

        await piProviderGenerate({
            command: "pi",
            prompt: "hello",
            pure: true,
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenCalledWith(
            expect.objectContaining({
                args: ["--mode", "json", "--print", "--no-tools", "--no-extensions", "--no-skills", "hello"]
            })
        );
    });

    it("does not add no-tools flags when pure mode is disabled or omitted", async () => {
        commandJSONLMock.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

        await piProviderGenerate({
            command: "pi",
            prompt: "hello",
            pure: false,
            sandbox: { wrapCommand: async (command) => command }
        });
        await piProviderGenerate({
            command: "pi",
            prompt: "world",
            sandbox: { wrapCommand: async (command) => command }
        });

        expect(commandJSONLMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                args: ["--mode", "json", "--print", "hello"]
            })
        );
        expect(commandJSONLMock).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                args: ["--mode", "json", "--print", "world"]
            })
        );
    });
});
