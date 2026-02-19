export interface Progress {
    update(message: string): void;
    done(message?: string): void;
    fail(message?: string): void;
}

const progressFrames = ["|", "/", "-", "\\"];
const progressTickMs = 120;
const progressDoneSymbol = "✔";
const progressFailSymbol = "❌";

/**
 * Starts a single-character ASCII spinner with an initial message.
 * Expects: initialMessage is non-empty user-facing text.
 */
export function progressStart(initialMessage: string): Progress {
    let message = initialMessage.trim();
    if (!message) {
        throw new Error("progressStart expects non-empty initialMessage.");
    }

    const stream = process.stderr;
    const interactive = Boolean(stream.isTTY);
    let frame = 0;
    let active = true;

    const render = () => {
        stream.write(`\r\x1b[2K${progressFrames[frame]!} ${message}`);
    };

    let timer: ReturnType<typeof setInterval> | undefined;
    if (interactive) {
        render();
        timer = setInterval(() => {
            frame = (frame + 1) % progressFrames.length;
            render();
        }, progressTickMs);
    } else {
        stream.write(`| ${message}\n`);
    }

    const finish = (symbol: string, nextMessage?: string) => {
        if (!active) {
            return;
        }
        active = false;
        if (timer) {
            clearInterval(timer);
            timer = undefined;
        }
        if (nextMessage?.trim()) {
            message = nextMessage.trim();
        }
        if (interactive) {
            stream.write(`\r\x1b[2K${symbol} ${message}\n`);
        } else {
            stream.write(`${symbol} ${message}\n`);
        }
    };

    return {
        update(nextMessage: string) {
            if (!active) {
                return;
            }
            const trimmed = nextMessage.trim();
            if (!trimmed) {
                return;
            }
            message = trimmed;
            if (interactive) {
                render();
            }
        },
        done(nextMessage?: string) {
            finish(progressDoneSymbol, nextMessage);
        },
        fail(nextMessage?: string) {
            finish(progressFailSymbol, nextMessage);
        }
    };
}
