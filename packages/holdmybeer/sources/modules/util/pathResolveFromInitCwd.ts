import path from "node:path";

/**
 * Resolves a path using INIT_CWD when invoked through Yarn.
 * Falls back to process.cwd() for direct execution.
 */
export function pathResolveFromInitCwd(inputPath: string): string {
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(baseDir, inputPath);
}
