import { beforeEach, describe, expect, it, vi } from "vitest";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

import { providerDetect } from "@/modules/providers/providerDetect.js";

describe("providerDetect", () => {
  beforeEach(() => {
    commandRunMock.mockReset();
  });

  it("detects pi and resolves available model ids from rpc", async () => {
    commandRunMock
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "1.2.3\n",
        stderr: ""
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: [
          JSON.stringify({
            id: "models",
            type: "response",
            command: "get_available_models",
            success: true,
            data: {
              models: [
                { provider: "openai-codex", id: "gpt-5.3-codex" },
                { provider: "anthropic", id: "claude-sonnet-4-6" }
              ]
            }
          })
        ].join("\n"),
        stderr: ""
      });

    const providers = await providerDetect();

    expect(commandRunMock).toHaveBeenNthCalledWith(
      1,
      "pi",
      ["--version"],
      expect.objectContaining({ allowFailure: true, timeoutMs: 8_000 })
    );
    expect(commandRunMock).toHaveBeenNthCalledWith(
      2,
      "pi",
      ["--mode", "rpc", "--no-session"],
      expect.objectContaining({
        allowFailure: true,
        timeoutMs: 15_000,
        input: "{\"id\":\"models\",\"type\":\"get_available_models\"}\n"
      })
    );

    expect(providers).toEqual([
      {
        id: "pi",
        available: true,
        command: "pi",
        version: "1.2.3",
        priority: 1,
        models: [
          {
            id: "openai-codex/gpt-5.3-codex",
            provider: "openai-codex",
            modelId: "gpt-5.3-codex"
          },
          {
            id: "anthropic/claude-sonnet-4-6",
            provider: "anthropic",
            modelId: "claude-sonnet-4-6"
          }
        ]
      }
    ]);
  });
});
