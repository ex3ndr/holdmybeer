import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runInferenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/workflows/steps/runInference.js", () => ({
  runInference: runInferenceMock
}));

import { ralphLoopExecute } from "@/workflows/steps/ralphLoopExecute.js";

describe("ralphLoopExecute", () => {
  beforeEach(() => {
    runInferenceMock.mockReset();
  });

  it("runs inference with plan content and write-whitelist policy", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-ralph-loop-exec-"));
    try {
      const planPath = path.join(tempDir, "plan.md");
      await writeFile(planPath, "# Plan\n- [ ] step\n", "utf-8");
      runInferenceMock.mockResolvedValue({ provider: "pi", text: "done\n" });

      const result = await ralphLoopExecute("ship feature", planPath, {
        showProgress: true,
        projectPath: "/tmp/project"
      });

      expect(result).toEqual({ provider: "pi", text: "done" });
      expect(runInferenceMock).toHaveBeenCalledWith(
        expect.stringContaining("{{planContent}}"),
        {
          buildGoal: "ship feature",
          planContent: "# Plan\n- [ ] step\n"
        },
        {
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
});
