import path from "node:path";

/**
 * Resolves a path using INIT_CWD when invoked through Bun/npm lifecycle scripts.
 * Falls back to process.cwd() for direct execution.
 */
export function pathResolveFromInitCwd(inputPath: string): string {
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(baseDir, inputPath);
}
