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
            tokenUsage: undefined,
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

        expect(result).toEqual({ output: "", sessionId: undefined, tokenUsage: undefined });
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

        expect(result).toEqual({ output: "ok", sessionId: "session-1", tokenUsage: undefined });
        expect(onEvent).toHaveBeenCalledWith({ type: "session_started", sessionId: "session-1" });
    });

    it("converts pi stream events to common full-state thinking/tool/text events", async () => {
        piProviderGenerateMock.mockImplementation(async (input) => {
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "thinking_start", contentIndex: 0 },
                message: {
                    content: [{ type: "thinking", thinking: "" }]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: {
                    type: "thinking_delta",
                    contentIndex: 0,
                    delta: "alyze"
                },
                message: {
                    content: [{ type: "thinking", thinking: "analyze" }]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "thinking_end", contentIndex: 0 },
                message: {
                    content: [{ type: "thinking", thinking: "analyze complete" }]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "toolcall_start", contentIndex: 1 },
                message: {
                    content: [
                        { type: "thinking", thinking: "analyze complete" },
                        { type: "toolCall", id: "tool-1", name: "Read", partialJson: '{"path"' }
                    ]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "toolcall_end", contentIndex: 1 },
                message: {
                    content: [
                        { type: "thinking", thinking: "analyze complete" },
                        {
                            type: "toolCall",
                            id: "tool-1",
                            name: "Read",
                            arguments: { path: "README.md" },
                            partialJson: '{"path":"README.md"}'
                        }
                    ]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "text_start", contentIndex: 2 },
                message: {
                    content: [
                        { type: "thinking", thinking: "analyze complete" },
                        { type: "toolCall", id: "tool-1", name: "Read", arguments: { path: "README.md" } },
                        { type: "text", text: "" }
                    ]
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "text_delta", contentIndex: 2, delta: "hello" },
                message: {
                    content: [
                        { type: "thinking", thinking: "analyze complete" },
                        { type: "toolCall", id: "tool-1", name: "Read", arguments: { path: "README.md" } },
                        { type: "text", text: "hello" }
                    ],
                    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 }
                }
            });
            input.onEvent?.({
                type: "message_update",
                assistantMessageEvent: { type: "text_end", contentIndex: 2 },
                message: {
                    content: [
                        { type: "thinking", thinking: "analyze complete" },
                        { type: "toolCall", id: "tool-1", name: "Read", arguments: { path: "README.md" } },
                        { type: "text", text: "hello" }
                    ]
                }
            });
            input.onEvent?.({
                type: "message_end",
                message: {
                    usage: { input: 12, output: 7, cacheRead: 1, cacheWrite: 0, totalTokens: 20 }
                }
            });
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

        expect(result).toEqual({
            output: "ok",
            sessionId: undefined,
            tokenUsage: {
                input: 12,
                output: 7,
                cacheRead: 1,
                cacheWrite: 0,
                total: 20
            }
        });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking", status: "started", text: "" });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking", status: "updated", text: "analyze" });
        expect(onEvent).toHaveBeenCalledWith({ type: "thinking", status: "stopped", text: "analyze complete" });
        expect(onEvent).toHaveBeenCalledWith({
            type: "tool_call",
            status: "started",
            toolName: "Read",
            toolCallId: "tool-1",
            arguments: undefined,
            partialJson: '{"path"',
            tokens: undefined
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: "tool_call",
            status: "stopped",
            toolName: "Read",
            toolCallId: "tool-1",
            arguments: { path: "README.md" },
            partialJson: '{"path":"README.md"}',
            tokens: undefined
        });
        expect(onEvent).toHaveBeenCalledWith({ type: "text", status: "started", text: "", tokens: undefined });
        expect(onEvent).toHaveBeenCalledWith({ type: "text", status: "updated", text: "hello", tokens: undefined });
        expect(onEvent).toHaveBeenCalledWith({ type: "text", status: "stopped", text: "hello", tokens: undefined });
        expect(onEvent).toHaveBeenCalledWith({
            type: "usage",
            tokens: {
                input: 12,
                output: 7,
                cacheRead: 1,
                cacheWrite: 0,
                total: 20
            }
        });
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

        expect(result).toEqual({ output: "ok", sessionId: undefined, tokenUsage: undefined });

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

    it("retries in same session when output verification fails", async () => {
        piProviderGenerateMock
            .mockResolvedValueOnce({
                exitCode: 0,
                stderr: "",
                output: "first"
            })
            .mockResolvedValueOnce({
                exitCode: 0,
                stderr: "",
                output: "second"
            });

        const validateOutput = vi
            .fn(async (_output: string) => {})
            .mockRejectedValueOnce(new Error("missing required marker"))
            .mockResolvedValueOnce(undefined);

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false,
            validateOutput
        });

        expect(result).toEqual({ output: "second", sessionId: undefined, tokenUsage: undefined });
        expect(validateOutput).toHaveBeenCalledTimes(2);
        expect(validateOutput).toHaveBeenNthCalledWith(1, "first");
        expect(validateOutput).toHaveBeenNthCalledWith(2, "second");

        const secondCall = piProviderGenerateMock.mock.calls[1]?.[0] as { prompt?: string; continueSession?: boolean };
        expect(secondCall.prompt).toContain("failed output verification");
        expect(secondCall.prompt).toContain("missing required marker");
        expect(secondCall.continueSession).toBe(true);
    });

    it("fails when output verification keeps failing after retries", async () => {
        piProviderGenerateMock.mockResolvedValue({
            exitCode: 0,
            stderr: "",
            output: "still-wrong"
        });

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false,
            outputValidationRetries: 1,
            validateOutput: () => {
                throw new Error("not valid yet");
            }
        });

        expect(piProviderGenerateMock).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            output: null,
            sessionId: undefined,
            tokenUsage: undefined,
            failure: {
                providerId: "pi",
                exitCode: 1,
                stderr: "Output verification failed: not valid yet"
            }
        });
    });

    it("uses 10 retries by default for output verification failures", async () => {
        piProviderGenerateMock.mockResolvedValue({
            exitCode: 0,
            stderr: "",
            output: "still-wrong"
        });

        const result = await providerGenerate({
            providerId: "pi",
            command: "pi",
            prompt: "hello",
            sandbox: { wrapCommand: async (command) => command },
            requireOutputTags: false,
            validateOutput: () => {
                throw new Error("default retry test");
            }
        });

        expect(piProviderGenerateMock).toHaveBeenCalledTimes(11);
        expect(result).toEqual({
            output: null,
            sessionId: undefined,
            tokenUsage: undefined,
            failure: {
                providerId: "pi",
                exitCode: 1,
                stderr: "Output verification failed: default retry test"
            }
        });
    });
});
