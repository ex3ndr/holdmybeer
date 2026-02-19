import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  text,
  type TextKey,
  type TextKeysWithValues,
  type TextKeysWithoutValues,
  type TextValuesForKey
} from "@/text/text.gen.js";

type TextFormatValues = Record<string, string | number>;

export { text };
export type {
  TextKey,
  TextKeysWithValues,
  TextKeysWithoutValues,
  TextValuesForKey
} from "@/text/text.gen.js";

/** Replaces {key} placeholders in a template with provided values. */
export function textFormat(
  template: string,
  values: TextFormatValues
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, k: string) => String(values[k] ?? `{${k}}`)
  );
}

/** Formats a catalog entry by key with strongly typed placeholder values. */
export function textFormatKey<K extends TextKey>(
  key: K,
  values: TextValuesForKey<K>
): string {
  return textFormat(text[key], values as TextFormatValues);
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

export function beerLog<K extends TextKeysWithoutValues>(key: K): void;
export function beerLog<K extends TextKeysWithValues>(
  key: K,
  values: TextValuesForKey<K>
): void;

/** Logs a catalog message with optional template substitution to log file only. */
export function beerLog(
  key: TextKey,
  values?: TextFormatValues
): void {
  beerLogLine(values ? textFormat(text[key], values) : text[key]);
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
