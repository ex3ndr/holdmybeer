import { EventEmitter } from "node:events";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: spawnMock
}));

import { commandRun } from "@/modules/util/commandRun.js";

function spawnSuccessChild(): EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: { write: (input: string) => void; end: () => void };
  kill: (signal: string) => void;
} {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: (input: string) => void; end: () => void };
    kill: (signal: string) => void;
  };

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = {
    write: () => undefined,
    end: () => undefined
  };
  child.kill = () => undefined;

  queueMicrotask(() => {
    child.emit("close", 0);
  });

  return child;
}

describe("commandRun", () => {
  const initCwd = process.env.INIT_CWD;

  beforeEach(() => {
    spawnMock.mockReset();
    process.env.INIT_CWD = "/tmp/holdmybeer-invocation";
    spawnMock.mockImplementation(() => spawnSuccessChild());
  });

  it("uses INIT_CWD as default cwd when options.cwd is not provided", async () => {
    await commandRun("echo", ["ok"]);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[2]?.cwd).toBe("/tmp/holdmybeer-invocation");
  });

  it("uses explicit options.cwd when provided", async () => {
    await commandRun("echo", ["ok"], { cwd: "/tmp/explicit-cwd" });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[2]?.cwd).toBe("/tmp/explicit-cwd");
  });

  afterAll(() => {
    process.env.INIT_CWD = initCwd;
  });
});
