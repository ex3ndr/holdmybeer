export interface StepProgress {
  update(message: string): void;
  done(message?: string): void;
  fail(message?: string): void;
}

const stepProgressFrames = ["|", "/", "-", "\\"];
const stepProgressTickMs = 120;

/**
 * Starts a single-character ASCII spinner with an initial message.
 * Expects: initialMessage is non-empty user-facing text.
 */
export function stepProgressStart(initialMessage: string): StepProgress {
  let message = initialMessage.trim();
  if (!message) {
    throw new Error("stepProgressStart expects non-empty initialMessage.");
  }

  const stream = process.stderr;
  const interactive = Boolean(stream.isTTY);
  let frame = 0;
  let active = true;

  const render = () => {
    stream.write(`\r${stepProgressFrames[frame]!} ${message}`);
  };

  let timer: ReturnType<typeof setInterval> | undefined;
  if (interactive) {
    render();
    timer = setInterval(() => {
      frame = (frame + 1) % stepProgressFrames.length;
      render();
    }, stepProgressTickMs);
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
    if (nextMessage && nextMessage.trim()) {
      message = nextMessage.trim();
    }
    if (interactive) {
      stream.write(`\r${symbol} ${message}\n`);
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
      finish("*", nextMessage);
    },
    fail(nextMessage?: string) {
      finish("x", nextMessage);
    }
  };
}
