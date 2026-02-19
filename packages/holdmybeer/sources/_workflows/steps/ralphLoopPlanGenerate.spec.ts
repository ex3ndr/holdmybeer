import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "@text";

const runInferenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/_workflows/steps/runInference.js", () => ({
  runInference: runInferenceMock
}));

import { ralphLoopPlanGenerate } from "@/_workflows/steps/ralphLoopPlanGenerate.js";

describe("ralphLoopPlanGenerate", () => {
  beforeEach(() => {
    runInferenceMock.mockReset();
  });

  it("writes generated plan markdown to target path", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-ralph-loop-plan-"));
    try {
      const planPath = path.join(tempDir, "plan.md");
      runInferenceMock.mockResolvedValue({
        provider: "pi",
        text: "# Plan\n\n- [ ] step"
      });

      const result = await ralphLoopPlanGenerate("add feature", {
        showProgress: true,
        planPath
      });

      expect(result).toEqual({
        planPath,
        provider: "pi",
        text: "# Plan\n\n- [ ] step"
      });
      expect(runInferenceMock).toHaveBeenCalledWith(
        expect.stringContaining("{{buildGoal}}"),
        { buildGoal: "add feature" },
        {
          progressMessage: text["inference_plan_generating"]!,
          showProgress: true,
          modelSelectionMode: "quality",
          writePolicy: { mode: "read-only" }
        }
      );
      expect(await readFile(planPath, "utf-8")).toBe("# Plan\n\n- [ ] step\n");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
