export type RewritePreset = "baseline";

export interface RewriteOptions {
  sourceDir: string;
  outputDir: string;
  dryRun: boolean;
  force: boolean;
  include: string[];
  exclude: string[];
  reportPath?: string;
  preset: RewritePreset;
}

export interface FileRewriteResult {
  path: string;
  outputPath: string;
  kind: "text" | "binary";
  changed: boolean;
  transforms: string[];
  bytesBefore: number;
  bytesAfter: number;
}

export interface RewriteReport {
  sourceDir: string;
  outputDir: string;
  reportPath?: string;
  dryRun: boolean;
  preset: RewritePreset;
  filesProcessed: number;
  filesRewritten: number;
  binaryFilesCopied: number;
  transformUsage: Record<string, number>;
  files: FileRewriteResult[];
  startedAt: string;
  finishedAt: string;
}
