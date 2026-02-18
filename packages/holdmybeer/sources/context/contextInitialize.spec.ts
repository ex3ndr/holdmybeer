import { beforeEach, describe, expect, it, vi } from "vitest";

const providerDetectMock = vi.hoisted(() => vi.fn());
const aiTextGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("../providers/providerDetect.js", () => ({
  providerDetect: providerDetectMock
}));

vi.mock("../ai/aiTextGenerate.js", () => ({
  aiTextGenerate: aiTextGenerateMock
}));

import { contextInitialize } from "./contextInitialize.js";

describe("contextInitialize", () => {
  beforeEach(() => {
    providerDetectMock.mockReset();
    aiTextGenerateMock.mockReset();
    globalThis.Context = undefined;
  });

  it("creates global Context and wires inferText through prioritized providers", async () => {
    providerDetectMock.mockResolvedValue([
      { id: "claude", available: true, command: "claude", priority: 1 },
      { id: "codex", available: true, command: "codex", priority: 2 }
    ]);
    aiTextGenerateMock.mockResolvedValue({ provider: "codex", text: "ok" });

    const context = await contextInitialize();
    const result = await context.inferText({
      providerPriority: ["codex", "claude"],
      prompt: "hello",
      fallbackText: "fallback"
    });

    expect(globalThis.Context).toBe(context);
    expect(result).toEqual({ provider: "codex", text: "ok" });
    expect(aiTextGenerateMock).toHaveBeenCalledWith(
      context.providers,
      ["codex", "claude"],
      "hello",
      "fallback"
    );
  });
});
