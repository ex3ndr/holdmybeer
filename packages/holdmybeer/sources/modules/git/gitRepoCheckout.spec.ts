import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { commandRun } from "@/modules/util/commandRun.js";
import { gitRepoCheckout } from "@/modules/git/gitRepoCheckout.js";

describe("gitRepoCheckout", () => {
  it("recreates a shallow clone at target path", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "beer-git-"));
    const sourceDir = path.join(tempRoot, "source");
    const targetDir = path.join(tempRoot, "target");

    await commandRun("git", ["init", sourceDir]);
    await writeFile(path.join(sourceDir, "README.md"), "hello\n", "utf-8");
    await commandRun("git", ["-C", sourceDir, "add", "README.md"]);
    await commandRun("git", [
      "-C",
      sourceDir,
      "-c",
      "user.name=holdmybeer",
      "-c",
      "user.email=holdmybeer@example.com",
      "commit",
      "-m",
      "init"
    ]);

    const hash = await gitRepoCheckout(sourceDir, targetDir);

    const readme = await readFile(path.join(targetDir, "README.md"), "utf-8");
    expect(readme).toBe("hello\n");
    expect(hash).toMatch(/^[0-9a-f]{40}$/);

    await rm(tempRoot, { recursive: true, force: true });
  });
});
