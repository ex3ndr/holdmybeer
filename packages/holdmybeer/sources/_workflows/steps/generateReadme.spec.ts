import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "@text";

const runInferenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/_workflows/steps/runInference.js", () => ({
  runInference: runInferenceMock
}));

import { generateReadme } from "@/_workflows/steps/generateReadme.js";

describe("generateReadme", () => {
  beforeEach(() => {
    runInferenceMock.mockReset();
  });

  it("runs sonnet read-only inference with resolved README prompt", async () => {
    runInferenceMock.mockResolvedValue({ provider: "pi", text: "# README" });

    const result = await generateReadme({
      sourceFullName: "acme/source",
      publishFullName: "acme/project",
      originalCheckoutPath: "/tmp/original"
    }, {
      showProgress: true
    });

    expect(result).toEqual({ provider: "pi", text: "# README" });
    expect(runInferenceMock).toHaveBeenCalledWith(
      expect.stringContaining("acme/source"),
      {},
      {
        progressMessage: text["bootstrap_readme_generating"]!,
        showProgress: true,
        modelSelectionMode: "sonnet",
        writePolicy: { mode: "read-only" }
      }
    );
  });
});
