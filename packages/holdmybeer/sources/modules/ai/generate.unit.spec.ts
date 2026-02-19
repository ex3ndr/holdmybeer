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

  it("parses PI text_delta event", async () => {
    providerGenerateMock.mockImplementation(async (input) => {
      input.onStdoutText?.('{"type":"text_delta","contentIndex":0,"delta":"Hello"}\n');
      return { output: "ok" };
    });

    const onEvent = vi.fn();
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

    await generate(context, "hello", { onEvent });

    expect(onEvent).toHaveBeenCalledWith("provider=pi event=text_delta");
  });

  it("parses PI toolcall_start event with tool name", async () => {
    const event = JSON.stringify({
      type: "toolcall_start",
      contentIndex: 0,
      partial: {
        role: "assistant",
        content: [{ type: "toolCall", name: "Read", id: "t1", arguments: {} }]
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

  it("parses PI toolcall_end event with tool name", async () => {
    const event = JSON.stringify({
      type: "toolcall_end",
      contentIndex: 0,
      toolCall: { type: "toolCall", name: "Bash", id: "t1", arguments: {} }
    });
    providerGenerateMock.mockImplementation(async (input) => {
      input.onStdoutText?.(`${event}\n`);
      return { output: "ok" };
    });

    const onEvent = vi.fn();
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

    await generate(context, "hello", { onEvent });

    expect(onEvent).toHaveBeenCalledWith("provider=pi event=toolcall_end tool=Bash");
  });

  it("parses PI done event with reason", async () => {
    const event = JSON.stringify({ type: "done", reason: "stop" });
    providerGenerateMock.mockImplementation(async (input) => {
      input.onStdoutText?.(`${event}\n`);
      return { output: "ok" };
    });

    const onEvent = vi.fn();
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;

    await generate(context, "hello", { onEvent });

    expect(onEvent).toHaveBeenCalledWith("provider=pi event=done reason=stop");
  });
});
