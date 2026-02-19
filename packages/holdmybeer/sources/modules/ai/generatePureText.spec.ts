import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const providerPriorityListMock = vi.hoisted(() => vi.fn());
const providerModelSelectMock = vi.hoisted(() => vi.fn());
const providerGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/providers/providerPriorityList.js", () => ({
    providerPriorityList: providerPriorityListMock
}));

vi.mock("@/modules/providers/providerModelSelect.js", () => ({
    providerModelSelect: providerModelSelectMock
}));

vi.mock("@/modules/ai/providerGenerate.js", () => ({
    providerGenerate: providerGenerateMock
}));

import { generatePureText } from "@/modules/ai/generatePureText.js";

describe("generatePureText", () => {
    beforeEach(() => {
        providerPriorityListMock.mockReset();
        providerModelSelectMock.mockReset();
        providerGenerateMock.mockReset();
        providerPriorityListMock.mockReturnValue([{ id: "pi", command: "pi" }]);
        providerModelSelectMock.mockReturnValue(undefined);
    });

    it("uses raw prompt with pure provider flags and passthrough sandbox", async () => {
        providerGenerateMock.mockResolvedValue({
            output: "pure-response",
            sessionId: "session-1"
        });
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        const result = await generatePureText(context, "raw prompt", { sessionId: "session-0" });

        expect(result).toEqual({
            provider: "pi",
            sessionId: "session-1",
            text: "pure-response"
        });
        expect(providerGenerateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                providerId: "pi",
                command: "pi",
                prompt: "raw prompt",
                pure: true,
                sessionId: "session-0",
                projectPath: "/tmp/project",
                requireOutputTags: false
            })
        );
        const input = providerGenerateMock.mock.calls[0]?.[0] as
            | {
                  sandbox: { wrapCommand: (command: string) => Promise<string> };
                  writePolicy?: unknown;
                  validateOutput?: unknown;
              }
            | undefined;
        expect(input?.writePolicy).toBeUndefined();
        expect(input?.validateOutput).toBeUndefined();
        await expect(input?.sandbox.wrapCommand("pi --mode json --print hello")).resolves.toBe(
            "pi --mode json --print hello"
        );
    });

    it("emits all_providers_failed and throws when providers fail", async () => {
        providerGenerateMock.mockResolvedValue({
            output: null,
            failure: {
                providerId: "pi",
                exitCode: 2,
                stderr: "provider failed"
            }
        });
        const onEvent = vi.fn();
        const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

        await expect(generatePureText(context, "raw prompt", { onEvent })).rejects.toThrow(
            "Inference failed for all providers: pi(exit=2, stderr=provider failed)"
        );
        expect(onEvent).toHaveBeenCalledWith({
            type: "all_providers_failed",
            failures: [{ providerId: "pi", exitCode: 2, stderr: "provider failed" }]
        });
    });
});
