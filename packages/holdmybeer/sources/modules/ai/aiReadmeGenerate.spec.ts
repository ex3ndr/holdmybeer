import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/types";

const generateMock = vi.hoisted(() => vi.fn());

vi.mock("./generate.js", () => ({
  generate: generateMock
}));

import { aiReadmeGenerate } from "@/modules/ai/aiReadmeGenerate.js";

describe("aiReadmeGenerate", () => {
  beforeEach(() => {
    generateMock.mockReset();
  });

  it("uses generate with read-only permissions", async () => {
    const context = {} as Context;
    generateMock.mockResolvedValue({ provider: "pi", text: "# test" });

    const result = await aiReadmeGenerate(
      context,
      {
        sourceFullName: "acme/source",
        publishFullName: "acme/project",
        originalCheckoutPath: "/tmp/original"
      },
      { showProgress: true }
    );

    expect(result).toEqual({ provider: "pi", text: "# test" });
    expect(generateMock).toHaveBeenCalledWith(
      context,
      expect.stringContaining("acme/source"),
      {
        modelSelectionMode: "quality",
        showProgress: true,
        writePolicy: { mode: "read-only" }
      }
    );
  });
});
