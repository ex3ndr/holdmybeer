import { beforeEach, describe, expect, it, vi } from "vitest";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

import { providerModelsGet } from "@/modules/providers/providerModelsGet.js";

describe("providerModelsGet", () => {
  beforeEach(() => {
    commandRunMock.mockReset();
  });

  it("returns normalized provider/model ids from rpc response", async () => {
    commandRunMock.mockResolvedValue({
      exitCode: 0,
      stdout: [
        JSON.stringify({ type: "session", id: "abc" }),
        JSON.stringify({
          id: "models",
          type: "response",
          command: "get_available_models",
          success: true,
          data: {
            models: [
              { provider: "openai-codex", id: "gpt-5.3-codex" },
              { provider: "openai-codex", id: "gpt-5.3-codex" },
              { provider: "anthropic", id: "claude-sonnet-4-6" }
            ]
          }
        })
      ].join("\n"),
      stderr: ""
    });

    const result = await providerModelsGet("pi");

    expect(commandRunMock).toHaveBeenCalledWith(
      "pi",
      ["--mode", "rpc", "--no-session"],
      {
        allowFailure: true,
        timeoutMs: 15_000,
        input: "{\"id\":\"models\",\"type\":\"get_available_models\"}\n"
      }
    );
    expect(result).toEqual([
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
    ]);
  });

  it("returns empty list when rpc call fails", async () => {
    commandRunMock.mockResolvedValue({
      exitCode: 1,
      stdout: "",
      stderr: "boom"
    });

    await expect(providerModelsGet("pi")).resolves.toEqual([]);
  });
});
