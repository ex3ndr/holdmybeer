import { describe, expect, it } from "vitest";
import { providerModelSelect } from "@/modules/providers/providerModelSelect.js";

describe("providerModelSelect", () => {
  const provider = {
    id: "pi",
    available: true,
    priority: 1,
    command: "pi",
    models: [
      { id: "openai-codex/gpt-5.3-codex", provider: "openai-codex", modelId: "gpt-5.3-codex" },
      { id: "anthropic/claude-sonnet-4-6", provider: "anthropic", modelId: "claude-sonnet-4-6" },
      { id: "anthropic/claude-haiku-4-5", provider: "anthropic", modelId: "claude-haiku-4-5" }
    ]
  } as const;

  it("selects the first preferred model that exists", () => {
    const selected = providerModelSelect(provider, [
      "openai-codex/gpt-5.2-codex",
      "openai-codex/gpt-5.3-codex"
    ]);

    expect(selected).toBe("openai-codex/gpt-5.3-codex");
  });

  it("supports unqualified model ids and globs", () => {
    expect(providerModelSelect(provider, ["claude-sonnet-4-6"]))
      .toBe("anthropic/claude-sonnet-4-6");
    expect(providerModelSelect(provider, ["anthropic/claude-*"]))
      .toBe("anthropic/claude-sonnet-4-6");
  });

  it("falls back to first available model", () => {
    const selected = providerModelSelect(provider, ["missing/model"]);

    expect(selected).toBe("openai-codex/gpt-5.3-codex");
  });
});
