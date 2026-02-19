import { describe, expect, it } from "vitest";
import { AsyncLock } from "@/modules/util/asyncLock.js";

function asyncLockSleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("AsyncLock", () => {
    it("executes concurrent operations sequentially", async () => {
        const lock = new AsyncLock();
        const order: string[] = [];

        await Promise.all([
            lock.inLock(async () => {
                order.push("first:start");
                await asyncLockSleep(10);
                order.push("first:end");
            }),
            lock.inLock(async () => {
                order.push("second:start");
                order.push("second:end");
            })
        ]);

        expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    });

    it("queues many callers with single concurrency", async () => {
        const lock = new AsyncLock();
        let current = 0;
        let max = 0;

        const values = await Promise.all(
            Array.from({ length: 5 }, (_, index) =>
                lock.inLock(async () => {
                    current += 1;
                    max = Math.max(max, current);
                    await asyncLockSleep(1);
                    current -= 1;
                    return index;
                })
            )
        );

        expect(max).toBe(1);
        expect(values).toEqual([0, 1, 2, 3, 4]);
    });

    it("propagates errors and still releases for later callers", async () => {
        const lock = new AsyncLock();

        const first = lock.inLock(async () => {
            throw new Error("boom");
        });
        const second = lock.inLock(async () => "ok");

        await expect(first).rejects.toThrow("boom");
        await expect(second).resolves.toBe("ok");
    });

    it("returns the callback value", async () => {
        const lock = new AsyncLock();
        const value = await lock.inLock(async () => ({ id: "value" }));
        expect(value).toEqual({ id: "value" });
    });
});
