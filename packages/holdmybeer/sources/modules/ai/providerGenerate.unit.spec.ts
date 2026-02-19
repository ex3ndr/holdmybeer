import { beforeEach, describe, expect, it, vi } from "vitest";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

import { providerGenerate } from "@/modules/ai/providerGenerate.js";

describe("providerGenerate", () => {
  beforeEach(() => {
    commandRunMock.mockReset();
  });

  it("fails text mode when pi json output has no assistant message", async () => {
    commandRunMock.mockResolvedValue({
      exitCode: 0,
      stdout: "{\"type\":\"session\"}\n",
      stderr: ""
    });

    const result = await providerGenerate({
      providerId: "pi",
      command: "pi",
      prompt: "hello",
      sandbox: { wrapCommand: async (command) => command }
    });

    expect(commandRunMock).toHaveBeenCalledWith(
      "pi",
      ["--mode", "json", "--print", "--no-session", "hello"],
      expect.objectContaining({ allowFailure: true, timeoutMs: null })
    );
    expect(result).toEqual({
      output: null,
      failure: {
        providerId: "pi",
        exitCode: 1,
        stderr: "Provider returned no JSON assistant output."
      }
    });
  });

  it("allows empty assistant text in file mode", async () => {
    commandRunMock.mockResolvedValue({
      exitCode: 0,
      stdout: "{\"type\":\"session\"}\n",
      stderr: ""
    });

    const result = await providerGenerate({
      providerId: "pi",
      command: "pi",
      prompt: "write file",
      sandbox: { wrapCommand: async (command) => command },
      requireOutputTags: false
    });

    expect(result).toEqual({ output: "" });
  });
});
