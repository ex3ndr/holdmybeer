import { describe, expect, it } from "vitest";
import { applyBaselineRewrite } from "./baselineRewrite.js";

describe("applyBaselineRewrite", () => {
  it("normalizes formatting noise", () => {
    const input = "\tconst a = 1;  \r\n\r\n\r\nconst b = 2;\t";
    const output = applyBaselineRewrite(input);

    expect(output.output).toBe("  const a = 1;\n\nconst b = 2;\n");
    expect(output.transforms).toEqual([
      "normalize-line-endings",
      "trim-trailing-whitespace",
      "replace-leading-tabs",
      "collapse-blank-lines",
      "ensure-trailing-newline"
    ]);
  });

  it("leaves already-clean content unchanged", () => {
    const input = "const a = 1;\n";
    const output = applyBaselineRewrite(input);

    expect(output.output).toBe(input);
    expect(output.transforms).toEqual([]);
  });
});
