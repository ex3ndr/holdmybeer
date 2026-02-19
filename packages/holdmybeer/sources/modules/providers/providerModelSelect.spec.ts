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
                id: "anthropic/claude-3-7-sonnet-latest",
                provider: "anthropic",
                modelId: "claude-3-7-sonnet-latest",
                reasoning: true,
                contextWindow: 200_000,
                maxTokens: 64_000
            },
            {
                id: "anthropic/claude-opus-4-1",
                provider: "anthropic",
                modelId: "claude-opus-4-1",
                reasoning: true,
                contextWindow: 200_000,
                maxTokens: 8_000
            },
            {
                id: "openai-codex/gpt-5.3-codex",
                provider: "openai-codex",
                modelId: "gpt-5.3-codex",
                reasoning: true,
                contextWindow: 256_000,
                maxTokens: 16_000
            },
            {
                id: "openai-codex/gpt-5.1-codex-max",
                provider: "openai-codex",
                modelId: "gpt-5.1-codex-max",
                reasoning: true,
                contextWindow: 512_000,
                maxTokens: 32_000
            },
            {
                id: "openai-codex/gpt-5.3-codex-spark",
                provider: "openai-codex",
                modelId: "gpt-5.3-codex-spark",
                reasoning: false,
                contextWindow: 128_000,
                maxTokens: 8_000
            },
            {
                id: "google-antigravity/gemini-3-pro-high",
                provider: "google-antigravity",
                modelId: "gemini-3-pro-high",
                reasoning: true,
                contextWindow: 1_048_576,
                maxTokens: 65_535
            }
        ]
    } as const;

    it("selects the first preferred model that exists", () => {
        const selected = providerModelSelect({
            provider,
            modelPriority: ["missing/model", "openai-codex/gpt-5.3-codex"]
        });

        expect(selected).toBe("openai-codex/gpt-5.3-codex");
    });

    it("supports unqualified model ids and globs", () => {
        expect(
            providerModelSelect({
                provider,
                modelPriority: ["gpt-5.3-codex-spark"]
            })
        ).toBe("openai-codex/gpt-5.3-codex-spark");

        expect(
            providerModelSelect({
                provider,
                modelPriority: ["anthropic/*"]
            })
        ).toBe("anthropic/claude-3-7-sonnet-latest");
    });

    it("falls back to static profile selection when priority has no match", () => {
        const selected = providerModelSelect({
            provider,
            modelPriority: ["missing/model"],
            mode: "opus"
        });

        expect(selected).toBe("anthropic/claude-opus-4-1");
    });

    it("uses static profile priority when no priority is provided", () => {
        expect(providerModelSelect({ provider, mode: "sonnet" })).toBe("anthropic/claude-3-7-sonnet-latest");
        expect(providerModelSelect({ provider, mode: "opus" })).toBe("anthropic/claude-opus-4-1");
        expect(providerModelSelect({ provider, mode: "codex-high" })).toBe("openai-codex/gpt-5.3-codex");
        expect(providerModelSelect({ provider, mode: "codex-xhigh" })).toBe("openai-codex/gpt-5.1-codex-max");
    });

    it("falls back to global static catalog when mode list has no match", () => {
        const providerWithGeminiOnly = {
            ...provider,
            models: [
                {
                    id: "google-antigravity/gemini-3-pro-high",
                    provider: "google-antigravity",
                    modelId: "gemini-3-pro-high"
                }
            ]
        } as const;

        expect(
            providerModelSelect({
                provider: providerWithGeminiOnly,
                mode: "codex-high"
            })
        ).toBe("google-antigravity/gemini-3-pro-high");
    });
});
