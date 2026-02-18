import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiTextGenerate } from "./aiTextGenerate.js";
import type { CommandRunOptions } from "../util/commandRun.js";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("../util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

describe("aiTextGenerate", () => {
  const sandbox = { wrapCommand: vi.fn() };

  beforeEach(() => {
    commandRunMock.mockReset();
    sandbox.wrapCommand.mockReset();
  });

  it("uses requested provider priority and falls back to next provider", async () => {
    commandRunMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "codex failed" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "claude output", stderr: "" });

    const result = await aiTextGenerate(
      [
        { id: "claude", available: true, command: "claude", priority: 1 },
        { id: "codex", available: true, command: "codex", priority: 2 }
      ],
      ["codex", "claude"],
      "test prompt",
      "fallback",
      { sandbox }
    );

    expect(result).toEqual({ provider: "claude", text: "claude output" });
    expect(commandRunMock).toHaveBeenCalledTimes(2);
    expect(commandRunMock.mock.calls[0]?.[0]).toBe("codex");
    expect(commandRunMock.mock.calls[1]?.[0]).toBe("claude");
    expect(commandRunMock.mock.calls[0]?.[1]).toEqual([
      "--dangerously-skip-permissions",
      "-p",
      expect.stringContaining("Do not change files")
    ]);
    expect(commandRunMock.mock.calls[1]?.[1]).toEqual([
      "--dangerously-skip-permissions",
      "-p",
      expect.stringContaining("Do not change files")
    ]);
  });

  it("returns fallback when no prioritized provider succeeds", async () => {
    commandRunMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "failed" });

    const result = await aiTextGenerate(
      [
        { id: "claude", available: true, command: "claude", priority: 1 },
        { id: "codex", available: true, command: "codex", priority: 2 }
      ],
      ["codex"],
      "test prompt",
      "fallback",
      { sandbox }
    );

    expect(result).toEqual({ text: "fallback" });
    expect(commandRunMock).toHaveBeenCalledTimes(1);
    expect(commandRunMock.mock.calls[0]?.[0]).toBe("codex");
  });

  it("passes sandbox into provider command execution", async () => {
    commandRunMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "claude output",
      stderr: ""
    });

    await aiTextGenerate(
      [{ id: "claude", available: true, command: "claude", priority: 1 }],
      ["claude"],
      "test prompt",
      "fallback",
      { sandbox }
    );

    expect(commandRunMock.mock.calls[0]?.[2]?.sandbox).toBe(sandbox);
  });

  it("emits progress messages when enabled", async () => {
    commandRunMock.mockImplementationOnce(
      async (_command: string, _args: string[], options?: CommandRunOptions) => {
        options?.onStdoutText?.("working...");
        options?.onStderrText?.("note");
        return { exitCode: 0, stdout: "claude output", stderr: "" };
      }
    );

    const messages: string[] = [];
    const result = await aiTextGenerate(
      [{ id: "claude", available: true, command: "claude", priority: 1 }],
      ["claude"],
      "test prompt",
      "fallback",
      { sandbox, onMessage: (message) => messages.push(message) }
    );

    expect(result).toEqual({ provider: "claude", text: "claude output" });
    expect(messages).toContain("[beer][infer] provider=claude selected");
    expect(messages).toContain("[beer][infer] provider=claude started");
    expect(messages).toContain("[beer][infer] claude:stdout working...");
    expect(messages).toContain("[beer][infer] claude:stderr note");
    expect(messages).toContain("[beer][infer] provider=claude completed");
  });

  it("injects write-whitelist prompt guard when write policy is provided", async () => {
    commandRunMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "codex output",
      stderr: ""
    });

    await aiTextGenerate(
      [{ id: "codex", available: true, command: "codex", priority: 1 }],
      ["codex"],
      "test prompt",
      "fallback",
      {
        sandbox,
        writePolicy: {
          mode: "write-whitelist",
          writablePaths: ["README.md", "doc/inference-sandbox.md"]
        }
      }
    );

    expect(commandRunMock.mock.calls[0]?.[1]).toEqual([
      "--dangerously-skip-permissions",
      "-p",
      expect.stringContaining("Write-whitelist mode is enabled.")
    ]);
    expect(commandRunMock.mock.calls[0]?.[1]?.[2]).toContain("README.md");
    expect(commandRunMock.mock.calls[0]?.[1]?.[2]).toContain(
      "doc/inference-sandbox.md"
    );
  });
});
