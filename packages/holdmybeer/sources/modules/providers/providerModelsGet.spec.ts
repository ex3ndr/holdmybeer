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

  it("returns normalized provider/model ids and metadata from rpc response", async () => {
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
              {
                provider: "alpha",
                id: "ultra-large",
                name: "Ultra Large",
                reasoning: true,
                contextWindow: 1_000_000,
                maxTokens: 64_000,
                input: ["text", "image"]
              },
              {
                provider: "alpha",
                id: "ultra-large"
              },
              {
                provider: "beta",
                id: "flash-mini",
                reasoning: false,
                contextWindow: 128_000,
                maxTokens: 8_000,
                input: ["text"]
              }
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
        id: "alpha/ultra-large",
        provider: "alpha",
        modelId: "ultra-large",
        name: "Ultra Large",
        reasoning: true,
        contextWindow: 1_000_000,
        maxTokens: 64_000,
        input: ["text", "image"]
      },
      {
        id: "beta/flash-mini",
        provider: "beta",
        modelId: "flash-mini",
        name: undefined,
        reasoning: false,
        contextWindow: 128_000,
        maxTokens: 8_000,
        input: ["text"]
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
