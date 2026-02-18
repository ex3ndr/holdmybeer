import { describe, expect, it, vi } from "vitest";
import { generate } from "@/modules/ai/generate.js";
import type { Context } from "@/types";

describe("generate", () => {
  it("passes prompt and permissions into context inference", async () => {
    const inferText = vi.fn().mockResolvedValue({ provider: "claude", text: "done" });
    const context = {
      inferText
    } as unknown as Context;

    const result = await generate(context, "prompt text", {
      providerPriority: ["codex"],
      showProgress: true,
      writePolicy: {
        mode: "write-whitelist",
        writablePaths: ["README.md"]
      }
    });

    expect(result).toEqual({ provider: "claude", text: "done" });
    expect(inferText).toHaveBeenCalledWith({
      providerPriority: ["codex"],
      prompt: "prompt text",
      showProgress: true,
      writePolicy: {
        mode: "write-whitelist",
        writablePaths: ["README.md"]
      }
    });
  });

  it("defaults to read-only permissions with standard provider order", async () => {
    const inferText = vi.fn().mockResolvedValue({ text: "done" });
    const context = {
      inferText
    } as unknown as Context;

    await generate(context, "prompt text");

    expect(inferText).toHaveBeenCalledWith({
      providerPriority: ["claude", "codex"],
      prompt: "prompt text",
      showProgress: undefined,
      writePolicy: { mode: "read-only" }
    });
  });
});
