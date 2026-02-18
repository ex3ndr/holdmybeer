import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { rewriteRun } from "./rewriteRun.js";

describe("rewriteRun", () => {
  it("rewrites text files and preserves extensionless files as text", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "beer-"));
    const sourceDir = path.join(tempRoot, "source");
    const outputDir = path.join(tempRoot, "out");

    await mkdir(path.join(sourceDir, "src"), { recursive: true });
    await writeFile(path.join(sourceDir, "src", "index.ts"), "\tconst value = 1;\r\n", "utf-8");
    await writeFile(path.join(sourceDir, "LICENSE"), "MIT\n", "utf-8");

    const report = await rewriteRun({
      sourceDir,
      outputDir,
      dryRun: false,
      force: true,
      include: [],
      exclude: [],
      preset: "baseline"
    });

    const rewritten = await readFile(path.join(outputDir, "src", "index.ts"), "utf-8");
    const copiedLicense = await readFile(path.join(outputDir, "LICENSE"), "utf-8");

    expect(rewritten).toBe("  const value = 1;\n");
    expect(copiedLicense).toBe("MIT\n");
    expect(report.filesProcessed).toBe(2);
    expect(report.filesRewritten).toBe(1);
    expect(report.binaryFilesCopied).toBe(0);

    await rm(tempRoot, { recursive: true, force: true });
  });
});
