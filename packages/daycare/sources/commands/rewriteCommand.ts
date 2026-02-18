import { Command } from "commander";
import path from "node:path";
import { rewriteRun } from "../rewrite/rewriteRun.js";

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

      const mode = report.dryRun ? "dry-run" : "write";
      console.log(`[daycare] mode=${mode}`);
      console.log(`[daycare] source=${report.sourceDir}`);
      console.log(`[daycare] output=${report.outputDir}`);
      console.log(`[daycare] processed=${report.filesProcessed}`);
      console.log(`[daycare] rewritten=${report.filesRewritten}`);
      console.log(`[daycare] copied_binary=${report.binaryFilesCopied}`);
      if (report.reportPath) {
        console.log(`[daycare] report=${report.reportPath}`);
      }
    });
}
