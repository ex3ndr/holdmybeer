import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { textGenGenerate } from "@/text/textGenGenerate.js";

describe("textGenGenerate", () => {
  it("builds text catalog and placeholder value types", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-text-generate-"));
    const catalogPath = path.join(tempDir, "all.txt");
    try {
      await writeFile(
        catalogPath,
        [
          "# test",
          "plain_key = Plain value",
          "value_key = Value with {name} and {count}"
        ].join("\n"),
        "utf-8"
      );

      const output = textGenGenerate(catalogPath);
      expect(output).toContain("plain_key: \"Plain value\"");
      expect(output).toContain("value_key: \"Value with {name} and {count}\"");
      expect(output).toContain("plain_key: Record<never, never>;");
      expect(output).toContain("name: string | number;");
      expect(output).toContain("count: string | number;");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
