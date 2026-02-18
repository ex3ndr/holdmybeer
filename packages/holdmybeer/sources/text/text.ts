import { readFileSync } from "node:fs";
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

/** Logs a message with optional template substitution. */
export function beerLog(
  key: string,
  values?: Record<string, string | number>
): void {
  const template = text[key];
  if (!template) {
    console.log(key);
    return;
  }
  console.log(values ? textFormat(template, values) : template);
}
