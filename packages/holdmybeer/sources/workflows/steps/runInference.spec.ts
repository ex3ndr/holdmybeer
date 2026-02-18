import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const contextGetOrInitializeMock = vi.hoisted(() => vi.fn());
const generateMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/context/contextGetOrInitialize.js", () => ({
  contextGetOrInitialize: contextGetOrInitializeMock
}));

vi.mock("@/modules/ai/generate.js", () => ({
  generate: generateMock
}));

import { runInference } from "@/workflows/steps/runInference.js";

describe("runInference", () => {
  beforeEach(() => {
    contextGetOrInitializeMock.mockReset();
    generateMock.mockReset();
  });

  it("loads global context and resolves handlebars in prompt", async () => {
    const context = { projectPath: "/tmp/project", providers: [] } as unknown as Context;
    contextGetOrInitializeMock.mockResolvedValue(context);
    generateMock.mockResolvedValue({ provider: "pi", text: "done" });

    const result = await runInference("Say {{word}} for {{repo}}", {
      word: "hello",
      repo: "owner/repo"
    }, {
      modelSelectionMode: "fast"
    });

    expect(result).toEqual({ provider: "pi", text: "done" });
    expect(contextGetOrInitializeMock).toHaveBeenCalledWith(process.cwd());
    expect(generateMock).toHaveBeenCalledWith(
      context,
      "Say hello for owner/repo",
      { modelSelectionMode: "fast" }
    );
  });
});
