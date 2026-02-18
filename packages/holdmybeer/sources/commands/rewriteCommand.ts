import { Command } from "commander";
import path from "node:path";
import { rewriteRun } from "../rewrite/rewriteRun.js";
import { beerLog } from "@text";

function collectOption(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function resolveFromInvocation(inputPath: string): string {
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(baseDir, inputPath);
}

export function rewriteCommand(): Command {
  return new Command("rewrite")
    .description("Rewrite a source codebase into a cleaner output directory")
    .argument("<sourceDir>", "Path to the source codebase")
    .option("-o, --output <dir>", "Output directory for rewritten code")
    .option("--force", "Overwrite output directory if it exists", false)
    .option("--dry-run", "Analyze and rewrite in-memory without writing files", false)
    .option("-i, --include <glob>", "Include glob (repeatable)", collectOption, [])
    .option("-x, --exclude <glob>", "Exclude glob (repeatable)", collectOption, [])
    .option("--report <path>", "Path to write JSON report")
    .action(async (sourceDir: string, options) => {
      const resolvedSource = resolveFromInvocation(sourceDir);
      const resolvedOutput = options.output
        ? resolveFromInvocation(options.output)
        : resolveFromInvocation(`${path.basename(resolvedSource)}-rewritten`);

      const report = await rewriteRun({
        sourceDir: resolvedSource,
        outputDir: resolvedOutput,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
        include: options.include,
        exclude: options.exclude,
        reportPath: options.report ? resolveFromInvocation(options.report) : undefined,
        preset: "baseline"
      });

      beerLog("rewrite_mode", { mode: report.dryRun ? "dry-run" : "write" });
      beerLog("rewrite_source", { source: report.sourceDir });
      beerLog("rewrite_output", { output: report.outputDir });
      beerLog("rewrite_processed", { count: report.filesProcessed });
      beerLog("rewrite_rewritten", { count: report.filesRewritten });
      beerLog("rewrite_copied_binary", { count: report.binaryFilesCopied });
      if (report.reportPath) {
        beerLog("rewrite_report", { path: report.reportPath });
      }
    });
}
