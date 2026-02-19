import { afterEach, describe, expect, it, vi } from "vitest";
import { progressMultilineStart } from "@/_workflows/context/utils/progressMultilineStart.js";

const originalIsTTY = process.stderr.isTTY;

afterEach(() => {
    process.stderr.isTTY = originalIsTTY;
});

describe("progressMultilineStart", () => {
    it("adds lines dynamically and prints lifecycle output in non-interactive mode", () => {
        process.stderr.isTTY = false;
        const writes: string[] = [];
        const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
            writes.push(String(chunk));
            return true;
        }) as typeof process.stderr.write);
        try {
            const progress = progressMultilineStart();
            const one = progress.add("first task");
            const two = progress.add("second task");

            one.update("first task updated");
            two.done();
            one.fail("first task failed");
            progress.stop();

            expect(writes).toEqual(["| first task\n", "| second task\n", "✔ second task\n", "❌ first task failed\n"]);
        } finally {
            writeSpy.mockRestore();
        }
    });

    it("applies doneRunning and failRunning only to active lines", () => {
        process.stderr.isTTY = false;
        const writes: string[] = [];
        const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
            writes.push(String(chunk));
            return true;
        }) as typeof process.stderr.write);
        try {
            const progress = progressMultilineStart();
            const one = progress.add("one");
            progress.add("two");
            one.done("one done");

            progress.doneRunning("default done");
            progress.failRunning("default failed");
            progress.stop();

            expect(writes).toEqual(["| one\n", "| two\n", "✔ one done\n", "✔ default done\n"]);
        } finally {
            writeSpy.mockRestore();
        }
    });
});
