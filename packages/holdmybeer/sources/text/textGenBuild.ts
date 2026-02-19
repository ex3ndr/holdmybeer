import { mkdir, writeFile } from "node:fs/promises";
import { textGenGenerate } from "@/text/textGenGenerate.js";

const outputPath = "./sources/text/text.gen.ts";

/**
 * Builds `text.gen.ts` from `all.txt` with types inferred from placeholders.
 * Expects: catalog and output paths are writable and inside sources/text.
 */
export async function textGenBuild(): Promise<void> {
    const source = textGenGenerate("./sources/text/all.txt");
    await mkdir("./sources/text", { recursive: true });
    await writeFile(outputPath, source, "utf-8");
}

await textGenBuild();
