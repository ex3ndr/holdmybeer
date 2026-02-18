import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Prompts for yes/no confirmation.
 * Accepts y/yes and n/no; blank answers resolve to defaultValue.
 */
export async function promptConfirm(
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} (${hint}): `)).trim().toLowerCase();
  rl.close();

  if (!answer) {
    return defaultValue;
  }
  if (answer === "y" || answer === "yes") {
    return true;
  }
  if (answer === "n" || answer === "no") {
    return false;
  }

  return defaultValue;
}
