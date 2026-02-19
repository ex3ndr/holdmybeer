import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    spawn: spawnMock
}));

import { commandJSONL } from "@/modules/ai/providers/commandJSONL.js";

type SpawnChild = EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { end: () => void };
    kill: (signal: string) => void;
};

function spawnChildCreate(): SpawnChild {
    const child = new EventEmitter() as SpawnChild;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
        end: () => undefined
    };
    child.kill = () => undefined;
    return child;
}

describe("commandJSONL", () => {
    beforeEach(() => {
        spawnMock.mockReset();
    });

    it("parses JSONL from stdout and ignores malformed lines", async () => {
        const child = spawnChildCreate();
        spawnMock.mockReturnValue(child);

        const events: unknown[] = [];
        const wrapCommand = vi.fn(async (command: string, _abortSignal?: AbortSignal) => command);
        const runPromise = commandJSONL({
            command: "pi",
            args: ["--mode", "json"],
            sandbox: { wrapCommand },
            onJsonlEvent: (event) => {
                events.push(event);
            }
        });
        await vi.waitFor(() => {
            expect(spawnMock).toHaveBeenCalledTimes(1);
        });

        child.stdout.emit("data", Buffer.from('{"type":"one"}\nnot-json\n{"type":"tw'));
        child.stdout.emit("data", Buffer.from('o"}\n'));
        child.emit("close", 0);

        const result = await runPromise;
        expect(result.exitCode).toBe(0);
        expect(events).toEqual([{ type: "one" }, { type: "two" }]);
        expect(wrapCommand).toHaveBeenCalledTimes(1);
        expect(wrapCommand.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    });

    it("stops process when provided abort signal is triggered", async () => {
        const child = spawnChildCreate();
        child.kill = vi.fn(() => {
            queueMicrotask(() => {
                child.emit("close", 1);
            });
        });
        spawnMock.mockReturnValue(child);

        const abortController = new AbortController();
        const events: unknown[] = [];
        const runPromise = commandJSONL({
            command: "pi",
            args: [],
            abortSignal: abortController.signal,
            sandbox: { wrapCommand: async (command) => command },
            onJsonlEvent: (event) => {
                events.push(event);
                abortController.abort();
            }
        });
        await vi.waitFor(() => {
            expect(spawnMock).toHaveBeenCalledTimes(1);
        });

        child.stdout.emit("data", Buffer.from('{"type":"stop"}\n'));

        const result = await runPromise;
        expect(events).toEqual([{ type: "stop" }]);
        expect(child.kill).toHaveBeenCalledWith("SIGTERM");
        expect(result.exitCode).toBe(1);
    });
});
