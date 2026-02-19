import { describe, expect, it } from "vitest";
import { providerModelSelect } from "@/modules/providers/providerModelSelect.js";

describe("providerModelSelect", () => {
  const provider = {
    id: "pi",
    available: true,
    priority: 1,
    command: "pi",
    models: [
      {
        id: "anthropic/claude-3-5-sonnet",
        provider: "anthropic",
        modelId: "claude-3-5-sonnet",
        reasoning: true,
        contextWindow: 200_000,
        maxTokens: 8_000
      },
      {
        id: "anthropic/claude-3-opus",
        provider: "anthropic",
        modelId: "claude-3-opus",
        reasoning: true,
        contextWindow: 200_000,
        maxTokens: 8_000
      },
      {
        id: "openai/codex-high",
        provider: "openai",
        modelId: "codex-high",
        reasoning: true,
        contextWindow: 256_000,
        maxTokens: 16_000
      },
      {
        id: "openai/codex-xhigh",
        provider: "openai",
        modelId: "codex-xhigh",
        reasoning: true,
        contextWindow: 512_000,
        maxTokens: 32_000
      },
      {
        id: "openai/gpt-mini",
        provider: "openai",
        modelId: "gpt-mini",
        reasoning: false,
        contextWindow: 128_000,
        maxTokens: 8_000
      }
    ]
  } as const;

  it("selects the first preferred model that exists", () => {
    const selected = providerModelSelect({
      provider,
      modelPriority: ["missing/model", "openai/codex-high"]
    });

    expect(selected).toBe("openai/codex-high");
  });

  it("supports unqualified model ids and globs", () => {
    expect(
      providerModelSelect({
        provider,
        modelPriority: ["gpt-mini"]
      })
    ).toBe("openai/gpt-mini");

    expect(
      providerModelSelect({
        provider,
        modelPriority: ["anthropic/*"]
      })
    ).toBe("anthropic/claude-3-5-sonnet");
  });

  it("falls back to score-based selection when priority has no match", () => {
    const selected = providerModelSelect({
      provider,
      modelPriority: ["missing/model"],
      mode: "opus"
    });

    expect(selected).toBe("anthropic/claude-3-opus");
  });

  it("uses profile-based selection when no priority is provided", () => {
    expect(providerModelSelect({ provider, mode: "sonnet" }))
      .toBe("anthropic/claude-3-5-sonnet");
    expect(providerModelSelect({ provider, mode: "opus" }))
      .toBe("anthropic/claude-3-opus");
    expect(providerModelSelect({ provider, mode: "codex-high" }))
      .toBe("openai/codex-high");
    expect(providerModelSelect({ provider, mode: "codex-xhigh" }))
      .toBe("openai/codex-xhigh");
  });
});
