import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { textFormatKey } from "@text";

const runInferenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/_workflows/steps/runInference.js", () => ({
  runInference: runInferenceMock
}));

import { ralphLoopReviewRound } from "@/_workflows/steps/ralphLoopReviewRound.js";

describe("ralphLoopReviewRound", () => {
  beforeEach(() => {
    runInferenceMock.mockReset();
  });

  it("runs a review round with plan content and write policy", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-ralph-loop-review-"));
    try {
      const planPath = path.join(tempDir, "plan.md");
      await writeFile(planPath, "# Plan\n", "utf-8");
      runInferenceMock.mockResolvedValue({ provider: "pi", text: "fixed" });

      const result = await ralphLoopReviewRound(2, planPath, {
        showProgress: true,
        projectPath: "/tmp/project"
      });

      expect(result).toEqual({ provider: "pi", text: "fixed" });
      expect(runInferenceMock).toHaveBeenCalledWith(
        expect.stringContaining("round {{round}} of 3"),
        {
          round: 2,
          planContent: "# Plan\n"
        },
        {
          progressMessage: textFormatKey("inference_review_round", { round: 2 }),
          showProgress: true,
          modelSelectionMode: "quality",
          writePolicy: {
            mode: "write-whitelist",
            writablePaths: ["/tmp/project"]
          }
        }
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects out-of-range rounds", async () => {
    await expect(ralphLoopReviewRound(4, "doc/plans/test.md")).rejects.toThrow(
      "Invalid review round: 4"
    );
  });
});
