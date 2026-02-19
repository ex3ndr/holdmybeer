import { mkdir, writeFile } from "node:fs/promises";
import { textGenMacro } from "@/text/textGenMacro.js" with { type: "macro" };

const outputPath = "./sources/text/text.gen.ts";

/**
 * Builds `text.gen.ts` from `all.txt` with types inferred from placeholders.
 * Expects: catalog and output paths are writable and inside sources/text.
 */
export async function textGenBuild(): Promise<void> {
  const source = textGenMacro("./sources/text/all.txt");
  await mkdir("./sources/text", { recursive: true });
  await writeFile(outputPath, source, "utf-8");
}

await textGenBuild();
