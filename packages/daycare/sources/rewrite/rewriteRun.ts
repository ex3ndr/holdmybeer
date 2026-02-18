import fg from "fast-glob";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyBaselineRewrite } from "./baselineRewrite.js";
import type { FileRewriteResult, RewriteOptions, RewriteReport } from "./rewriteTypes.js";

const DEFAULT_IGNORE_GLOBS = [
  "**/.git/**",
  "**/.context/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.turbo/**"
];

const REWRITE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".mjs",
  ".md",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

function isLikelyBinary(buffer: Buffer): boolean {
  const maxCheck = Math.min(buffer.length, 1024);
  for (let i = 0; i < maxCheck; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

function shouldRewrite(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return REWRITE_EXTENSIONS.has(ext);
}

async function ensureCleanOutput(outputDir: string, force: boolean): Promise<void> {
  try {
    await stat(outputDir);
    if (!force) {
      throw new Error(`Output directory already exists: ${outputDir}. Pass --force to overwrite.`);
    }
    await rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(outputDir, { recursive: true });
}

export async function rewriteRun(options: RewriteOptions): Promise<RewriteReport> {
  const sourceStat = await stat(options.sourceDir).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Source directory does not exist or is not a directory: ${options.sourceDir}`);
  }

  if (!options.dryRun) {
    await ensureCleanOutput(options.outputDir, options.force);
  }

  const startedAt = new Date().toISOString();
  const patterns = options.include.length > 0 ? options.include : ["**/*"];
  const files = await fg(patterns, {
    cwd: options.sourceDir,
    onlyFiles: true,
    dot: true,
    ignore: [...DEFAULT_IGNORE_GLOBS, ...options.exclude]
  });
  files.sort((a, b) => a.localeCompare(b));

  const results: FileRewriteResult[] = [];
  const transformUsage: Record<string, number> = {};
  let filesRewritten = 0;
  let binaryFilesCopied = 0;

  for (const relativePath of files) {
    const sourcePath = path.join(options.sourceDir, relativePath);
    const outputPath = path.join(options.outputDir, relativePath);

    const buffer = await readFile(sourcePath);
    if (isLikelyBinary(buffer)) {
      if (!options.dryRun) {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, buffer);
      }
      binaryFilesCopied += 1;
      results.push({
        path: sourcePath,
        outputPath,
        kind: "binary",
        changed: false,
        transforms: [],
        bytesBefore: buffer.byteLength,
        bytesAfter: buffer.byteLength
      });
      continue;
    }

    const input = buffer.toString("utf-8");
    const rewritten = shouldRewrite(relativePath)
      ? applyBaselineRewrite(input)
      : { output: input, transforms: [] };
    const output = rewritten.output;
    const changed = output !== input;

    if (changed) {
      filesRewritten += 1;
    }

    for (const transform of rewritten.transforms) {
      transformUsage[transform] = (transformUsage[transform] ?? 0) + 1;
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output, "utf-8");
    }

    results.push({
      path: sourcePath,
      outputPath,
      kind: "text",
      changed,
      transforms: rewritten.transforms,
      bytesBefore: Buffer.byteLength(input, "utf-8"),
      bytesAfter: Buffer.byteLength(output, "utf-8")
    });
  }

  const finishedAt = new Date().toISOString();
  const reportPath = options.reportPath ?? (!options.dryRun ? path.join(options.outputDir, "rewrite-report.json") : undefined);
  const report: RewriteReport = {
    sourceDir: options.sourceDir,
    outputDir: options.outputDir,
    reportPath,
    dryRun: options.dryRun,
    preset: options.preset,
    filesProcessed: files.length,
    filesRewritten,
    binaryFilesCopied,
    transformUsage,
    files: results,
    startedAt,
    finishedAt
  };

  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  }

  return report;
}
