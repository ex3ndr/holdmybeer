import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/ai/generate.js", () => ({
  generate: generateMock
}));

import { generateCommitMessage } from "@/workflows/steps/generateCommitMessage.js";

describe("generateCommitMessage", () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it("returns first line from model output", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    generateMock.mockResolvedValue({
      provider: "pi",
      text: "feat: initial bootstrap\nextra line"
    });

    const result = await generateCommitMessage(context, "owner/repo", { showProgress: true });

    expect(result).toEqual({
      provider: "pi",
      text: "feat: initial bootstrap"
    });
    expect(generateMock).toHaveBeenCalledWith(
      context,
      expect.stringContaining("owner/repo"),
      {
        showProgress: true,
        modelPriority: [
          "openai-codex/gpt-5.1-codex-mini",
          "openai-codex/gpt-5.3-codex",
          "anthropic/claude-haiku-4-5",
          "anthropic/claude-sonnet-4-6"
        ]
      }
    );
  });
});
