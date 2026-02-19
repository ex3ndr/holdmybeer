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

  it("parses provider message events and includes role tokens", async () => {
    providerGenerateMock.mockImplementation(async (input) => {
      input.onStdoutText?.("{\"type\":\"message_start\",\"message\":{\"role\":\"assistant\"}}\n");
      return { output: "ok" };
    });

    const onEvent = vi.fn();
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

    const result = await generate(context, "hello", { onEvent });

    expect(result).toEqual({ provider: "pi", text: "ok" });
    expect(onEvent).toHaveBeenCalledWith("provider=pi event=message_start role=assistant");
  });
});
