export interface ProgressLine {
    update(message: string): void;
    done(message?: string): void;
    fail(message?: string): void;
}

export interface ProgressMultiline {
    add(initialMessage: string): ProgressLine;
    doneRunning(message?: string): void;
    failRunning(message?: string): void;
    stop(): void;
}

interface ProgressMultilineState {
    message: string;
    status: "running" | "done" | "failed";
}

const progressFrames = ["|", "/", "-", "\\"];
const progressTickMs = 120;
const progressDoneSymbol = "✔";
const progressFailSymbol = "❌";

/**
 * Starts a multiline progress renderer where lines are added dynamically.
 * Expects: add() receives non-empty user-facing messages.
 */
export function progressMultilineStart(): ProgressMultiline {
    const stream = process.stderr;
    const interactive = Boolean(stream.isTTY);
    const states: ProgressMultilineState[] = [];
    let active = true;
    let frame = 0;
    let renderedLines = 0;

    const renderInteractive = () => {
        if (renderedLines > 0) {
            stream.write(`\x1b[${renderedLines}A`);
        }
        for (let index = 0; index < states.length; index++) {
            const state = states[index]!;
            stream.write(`\r\x1b[2K${progressSymbolResolve(state, index, frame)} ${state.message}\n`);
        }
        renderedLines = states.length;
    };

    const render = () => {
        if (!active || !interactive) {
            return;
        }
        renderInteractive();
    };

    let timer: ReturnType<typeof setInterval> | undefined;
    if (interactive) {
        timer = setInterval(() => {
            frame = (frame + 1) % progressFrames.length;
            renderInteractive();
        }, progressTickMs);
    }

    const finishState = (state: ProgressMultilineState, status: "done" | "failed", nextMessage?: string) => {
        if (!active || state.status !== "running") {
            return;
        }
        const trimmed = nextMessage?.trim();
        if (trimmed) {
            state.message = trimmed;
        }
        state.status = status;
        if (interactive) {
            render();
            return;
        }
        stream.write(`${status === "done" ? progressDoneSymbol : progressFailSymbol} ${state.message}\n`);
    };

    const applyToRunning = (status: "done" | "failed", nextMessage?: string) => {
        if (!active) {
            return;
        }
        for (const state of states) {
            finishState(state, status, nextMessage);
        }
    };

    return {
        add(initialMessage: string): ProgressLine {
            if (!active) {
                throw new Error("progressMultilineStart add() called after stop().");
            }
            const message = initialMessage.trim();
            if (!message) {
                throw new Error("progressMultilineStart add() expects non-empty initialMessage.");
            }

            const state: ProgressMultilineState = {
                message,
                status: "running"
            };
            states.push(state);

            if (interactive) {
                render();
            } else {
                stream.write(`| ${message}\n`);
            }

            return {
                update(nextMessage: string) {
                    if (!active || state.status !== "running") {
                        return;
                    }
                    const next = nextMessage.trim();
                    if (!next) {
                        return;
                    }
                    state.message = next;
                    render();
                },
                done(nextMessage?: string) {
                    finishState(state, "done", nextMessage);
                },
                fail(nextMessage?: string) {
                    finishState(state, "failed", nextMessage);
                }
            };
        },
        doneRunning(message?: string) {
            applyToRunning("done", message);
        },
        failRunning(message?: string) {
            applyToRunning("failed", message);
        },
        stop() {
            if (!active) {
                return;
            }
            active = false;
            if (timer) {
                clearInterval(timer);
                timer = undefined;
            }
        }
    };
}

function progressSymbolResolve(state: ProgressMultilineState, index: number, frame: number): string {
    if (state.status === "done") {
        return progressDoneSymbol;
    }
    if (state.status === "failed") {
        return progressFailSymbol;
    }
    return progressFrames[(frame + index) % progressFrames.length]!;
}
