import { Command } from "commander";
import { bootstrapRun } from "./bootstrapRun.js";

/**
 * Builds the bootstrap command entrypoint.
 */
export function bootstrapCommand(): Command {
  return new Command("bootstrap")
    .description("Initialize .beer settings, source/publish repos, README, and first push")
    .action(async () => {
      await bootstrapRun();
    });
}
