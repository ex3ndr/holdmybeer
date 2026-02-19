import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "@text";

const runInferenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/_workflows/steps/runInference.js", () => ({
  runInference: runInferenceMock
}));

import { generateCommit } from "@/_workflows/steps/generateCommit.js";

describe("generateCommit", () => {
  beforeEach(() => {
    runInferenceMock.mockReset();
  });

  it("returns first line from inference output", async () => {
    runInferenceMock.mockResolvedValue({
      provider: "pi",
      text: "feat: initial bootstrap\nextra line"
    });

    const result = await generateCommit("owner/repo", { showProgress: true });

    expect(result).toEqual({
      provider: "pi",
      text: "feat: initial bootstrap"
    });
      expect(runInferenceMock).toHaveBeenCalledWith(
        expect.stringContaining("{{sourceFullName}}"),
        { sourceFullName: "owner/repo" },
        {
          progressMessage: text["inference_commit_generating"]!,
          showProgress: true,
          modelSelectionMode: "fast"
        }
      );
  });
});
