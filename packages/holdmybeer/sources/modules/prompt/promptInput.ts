import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Prompts for free-form text input.
 * Returns the default value when input is blank.
 */
export async function promptInput(
  question: string,
  defaultValue?: string
): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  rl.close();
  return answer || defaultValue || "";
}
