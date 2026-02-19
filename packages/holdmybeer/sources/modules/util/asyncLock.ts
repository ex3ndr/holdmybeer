/**
 * Runs async callbacks sequentially under a single mutex.
 * Expects: callback handles its own failures; lock release happens in finally.
 */
export class AsyncLock {
    private pending: Promise<void> = Promise.resolve();

    async inLock<T>(fn: () => Promise<T>): Promise<T> {
        const waitForTurn = this.pending;
        let releaseTurn: () => void = () => {};
        this.pending = new Promise<void>((resolve) => {
            releaseTurn = resolve;
        });

        await waitForTurn;
        try {
            return await fn();
        } finally {
            releaseTurn();
        }
    }
}
