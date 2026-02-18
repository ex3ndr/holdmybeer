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
        id: "alpha/ultra-large",
        provider: "alpha",
        modelId: "ultra-large",
        reasoning: true,
        contextWindow: 1_000_000,
        maxTokens: 64_000
      },
      {
        id: "beta/flash-mini",
        provider: "beta",
        modelId: "flash-mini",
        reasoning: false,
        contextWindow: 128_000,
        maxTokens: 8_000
      },
      {
        id: "gamma/standard",
        provider: "gamma",
        modelId: "standard",
        reasoning: false,
        contextWindow: 256_000,
        maxTokens: 16_000
      }
    ]
  } as const;

  it("selects the first preferred model that exists", () => {
    const selected = providerModelSelect({
      provider,
      modelPriority: ["missing/model", "gamma/standard"]
    });

    expect(selected).toBe("gamma/standard");
  });

  it("supports unqualified model ids and globs", () => {
    expect(
      providerModelSelect({
        provider,
        modelPriority: ["flash-mini"]
      })
    ).toBe("beta/flash-mini");

    expect(
      providerModelSelect({
        provider,
        modelPriority: ["alpha/*"]
      })
    ).toBe("alpha/ultra-large");
  });

  it("falls back to score-based selection when priority has no match", () => {
    const selected = providerModelSelect({
      provider,
      modelPriority: ["missing/model"],
      mode: "quality"
    });

    expect(selected).toBe("alpha/ultra-large");
  });

  it("uses score-based selection when no priority is provided", () => {
    expect(providerModelSelect({ provider, mode: "quality" }))
      .toBe("alpha/ultra-large");
    expect(providerModelSelect({ provider, mode: "fast" }))
      .toBe("beta/flash-mini");
  });
});
