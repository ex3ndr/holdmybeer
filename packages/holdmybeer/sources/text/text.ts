import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Parses key = value lines from a text catalog, skipping comments and blanks. */
function textParse(raw: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    entries[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return entries;
}

const txtPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "all.txt"
);

/** All user-facing text strings, keyed by identifier. */
export const text: Record<string, string> = textParse(
  readFileSync(txtPath, "utf-8")
);

/** Replaces {key} placeholders in a template with provided values. */
export function textFormat(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, k: string) => String(values[k] ?? `{${k}}`)
  );
}

/** Writes a plain log line to the daily .beer/logs file. */
export function beerLogLine(message: string): void {
  try {
    const logFilePath = beerLogFilePathResolve();
    mkdirSync(path.dirname(logFilePath), { recursive: true });
    appendFileSync(logFilePath, `${new Date().toISOString()} ${message}\n`, "utf-8");
  } catch {
    // Logging must never break workflow execution.
  }
}

/** Logs a catalog message with optional template substitution to log file only. */
export function beerLog(
  key: string,
  values?: Record<string, string | number>
): void {
  const template = text[key];
  beerLogLine(template ? (values ? textFormat(template, values) : template) : key);
}

function beerLogFilePathResolve(): string {
  const projectPath = process.env.BEER_PROJECT_PATH
    ?? process.env.INIT_CWD
    ?? process.cwd();
  return path.join(projectPath, ".beer", "logs", `beer-${beerLogDateResolve()}.log`);
}

function beerLogDateResolve(): string {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
