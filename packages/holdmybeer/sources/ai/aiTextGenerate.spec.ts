import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiTextGenerate } from "./aiTextGenerate.js";
import type { CommandRunOptions } from "../util/commandRun.js";

const commandRunMock = vi.hoisted(() => vi.fn());

vi.mock("../util/commandRun.js", () => ({
  commandRun: commandRunMock
}));

describe("aiTextGenerate", () => {
  beforeEach(() => {
    commandRunMock.mockReset();
  });

  it("uses requested provider priority and falls back to next provider", async () => {
    commandRunMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "codex failed" })
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "codex failed" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "claude output", stderr: "" });

    const result = await aiTextGenerate(
      [
        { id: "claude", available: true, command: "claude", priority: 1 },
        { id: "codex", available: true, command: "codex", priority: 2 }
      ],
      ["codex", "claude"],
      "test prompt",
      "fallback"
    );

    expect(result).toEqual({ provider: "claude", text: "claude output" });
    expect(commandRunMock.mock.calls[0]?.[0]).toBe("codex");
    expect(commandRunMock.mock.calls[1]?.[0]).toBe("codex");
    expect(commandRunMock.mock.calls[2]?.[0]).toBe("claude");
    expect(commandRunMock.mock.calls[0]?.[1]).toEqual([
      "--sandbox",
      "read-only",
      "-p",
      expect.stringContaining("Do not change files")
    ]);
    expect(commandRunMock.mock.calls[2]?.[1]).toEqual([
      "--tools",
      "",
      "-p",
      expect.stringContaining("Do not change files")
    ]);
  });

  it("returns fallback when no prioritized provider succeeds", async () => {
    commandRunMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "failed" })
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "failed" });

    const result = await aiTextGenerate(
      [
        { id: "claude", available: true, command: "claude", priority: 1 },
        { id: "codex", available: true, command: "codex", priority: 2 }
      ],
      ["codex"],
      "test prompt",
      "fallback"
    );

    expect(result).toEqual({ text: "fallback" });
    expect(commandRunMock.mock.calls.map((call) => call[0])).toEqual(["codex", "codex"]);
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
      { onMessage: (message) => messages.push(message) }
    );

    expect(result).toEqual({ provider: "claude", text: "claude output" });
    expect(messages).toContain("[beer][infer] provider=claude selected");
    expect(messages).toContain("[beer][infer] provider=claude attempt=-p started");
    expect(messages).toContain("[beer][infer] claude:stdout working...");
    expect(messages).toContain("[beer][infer] claude:stderr note");
    expect(messages).toContain("[beer][infer] provider=claude completed");
  });
});
