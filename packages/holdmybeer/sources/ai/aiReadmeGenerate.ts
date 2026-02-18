import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Context } from "@/types";
import { textFormat } from "@text";
import { generate } from "./generate.js";

export interface AiReadmeGenerateInput {
  sourceFullName: string;
  publishFullName: string;
  originalCheckoutPath: string;
}

export interface AiReadmeGenerateOptions {
  showProgress?: boolean;
}

const promptTemplate = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../prompts/PROMPT_README.md"),
  "utf-8"
);

/**
 * Generates initial README markdown using provider priority with fallback content.
 * Reads the prompt template from PROMPT_README.md and substitutes input values.
 */
export async function aiReadmeGenerate(
  context: Context,
  input: AiReadmeGenerateInput,
  options: AiReadmeGenerateOptions = {}
): Promise<{ provider?: string; text: string }> {
  const prompt = textFormat(promptTemplate, {
    sourceFullName: input.sourceFullName,
    publishFullName: input.publishFullName,
    originalCheckoutPath: input.originalCheckoutPath
  });

  const fallback = [
    `# ${input.publishFullName.split("/").pop()}`,
    "",
    `> 🍺 This is a [HoldMyBeer](https://github.com/ex3ndr/holdmybeer) rewrite of [${input.sourceFullName}](https://github.com/${input.sourceFullName})`,
    "",
    "A clean rewrite of the original codebase — stripped of noise, normalized, and ready to extend.",
    "",
    "## Source",
    "",
    `- Original: [${input.sourceFullName}](https://github.com/${input.sourceFullName})`,
    `- Rewrite: [${input.publishFullName}](https://github.com/${input.publishFullName})`,
    "",
    "## Getting started",
    "",
    "```bash",
    "git clone https://github.com/" + input.publishFullName + ".git",
    "cd " + (input.publishFullName.split("/").pop() ?? "project"),
    "```",
    "",
    "## About this rewrite",
    "",
    "This repository was produced by [HoldMyBeer](https://github.com/ex3ndr/holdmybeer),",
    "an automated codebase rewriting tool that preserves functionality while improving code quality.",
    ""
  ].join("\n");

  return generate(context, prompt, fallback, {
    showProgress: options.showProgress,
    writePolicy: { mode: "read-only" }
  });
}
