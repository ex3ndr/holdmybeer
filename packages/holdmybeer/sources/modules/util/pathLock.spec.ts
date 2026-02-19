import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PathLock } from "@/modules/util/pathLock.js";

function pathLockDiskStateParse(raw: string): { locked: string[] } {
    return JSON.parse(raw) as { locked: string[] };
}

describe("PathLock memory mode", () => {
    it("locks paths, reports conflicts, and unlocks on release", async () => {
        const lock = PathLock.create();
        const first = await lock.lock(["src/bar"]);
        expect(first.locked).toBe(true);
        expect(first.conflicts).toEqual([]);
        expect(first.release).not.toBeNull();

        const second = await lock.lock(["src/bar/baz.ts"]);
        expect(second).toEqual({
            locked: false,
            conflicts: ["src/bar"],
            release: null
        });

        await first.release?.();
        const third = await lock.lock(["src/bar/baz.ts"]);
        expect(third.locked).toBe(true);
    });

    it("returns an idempotent release handle for empty lock requests", async () => {
        const lock = PathLock.create();
        const result = await lock.lock([]);

        expect(result.locked).toBe(true);
        expect(result.conflicts).toEqual([]);
        expect(result.release).not.toBeNull();

        await result.release?.();
        await result.release?.();
    });

    it("treats path normalization variants as the same lock", async () => {
        const lock = PathLock.create();
        const first = await lock.lock(["./src/bar/"]);
        expect(first.locked).toBe(true);

        const second = await lock.lock(["src/bar"]);
        expect(second).toEqual({
            locked: false,
            conflicts: ["src/bar"],
            release: null
        });
    });
});

describe("PathLock disk mode", () => {
    it("creates the lock file on open", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-path-lock-"));
        try {
            const lockPath = path.join(tempDir, "locks", "paths.json");
            await PathLock.open(lockPath);
            await expect(access(lockPath)).resolves.toBeUndefined();
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("persists lock and release state to disk", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-path-lock-"));
        try {
            const lockPath = path.join(tempDir, "paths.json");
            const lock = await PathLock.open(lockPath);
            const result = await lock.lock(["src/foo.ts"]);

            const lockedState = pathLockDiskStateParse(await readFile(lockPath, "utf-8"));
            expect(lockedState.locked).toEqual(["src/foo.ts"]);

            await result.release?.();
            const releasedState = pathLockDiskStateParse(await readFile(lockPath, "utf-8"));
            expect(releasedState.locked).toEqual([]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("reads existing disk state when reopened", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "holdmybeer-path-lock-"));
        try {
            const lockPath = path.join(tempDir, "paths.json");
            const first = await PathLock.open(lockPath);
            const firstLock = await first.lock(["src/bar"]);
            expect(firstLock.locked).toBe(true);

            const second = await PathLock.open(lockPath);
            const secondLock = await second.lock(["src/bar/baz.ts"]);
            expect(secondLock).toEqual({
                locked: false,
                conflicts: ["src/bar"],
                release: null
            });

            await firstLock.release?.();
            const thirdLock = await second.lock(["src/bar/baz.ts"]);
            expect(thirdLock.locked).toBe(true);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
