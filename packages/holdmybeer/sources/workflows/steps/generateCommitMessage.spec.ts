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
      provider: "claude",
      text: "feat: initial bootstrap\nextra line"
    });

    const result = await generateCommitMessage(context, "owner/repo", { showProgress: true });

    expect(result).toEqual({
      provider: "claude",
      text: "feat: initial bootstrap"
    });
    expect(generateMock).toHaveBeenCalledWith(
      context,
      expect.stringContaining("owner/repo"),
      { showProgress: true }
    );
  });
});
