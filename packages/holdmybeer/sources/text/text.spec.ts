import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { beerLog, beerLogLine } from "@text";

const originalBeerProjectPath = process.env.BEER_PROJECT_PATH;

describe("text logging", () => {
  afterEach(() => {
    if (originalBeerProjectPath === undefined) {
      delete process.env.BEER_PROJECT_PATH;
    } else {
      process.env.BEER_PROJECT_PATH = originalBeerProjectPath;
    }
  });

  it("writes catalog logs to .beer/local/logs daily file without console output", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-logs-"));
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      process.env.BEER_PROJECT_PATH = tempDir;
      beerLog("release_start");

      const logsDir = path.join(tempDir, ".beer", "local", "logs");
      const files = await readdir(logsDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^beer-\d{4}-\d{2}-\d{2}\.log$/);

      const content = await readFile(path.join(logsDir, files[0]!), "utf-8");
      expect(content).toContain("Starting release");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    } finally {
      consoleLogSpy.mockRestore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes raw lines to the same log file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-log-line-"));
    try {
      process.env.BEER_PROJECT_PATH = tempDir;
      beerLogLine("custom-line");

      const logsDir = path.join(tempDir, ".beer", "local", "logs");
      const files = await readdir(logsDir);
      const content = await readFile(path.join(logsDir, files[0]!), "utf-8");
      expect(content).toContain("custom-line");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
