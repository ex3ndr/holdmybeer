import type { Context } from "@/types";

export interface AiReadmeGenerateInput {
  sourceFullName: string;
  publishFullName: string;
}

/**
 * Generates initial README markdown using provider priority with fallback content.
 */
export async function aiReadmeGenerate(
  context: Context,
  input: AiReadmeGenerateInput
): Promise<{ provider?: string; text: string }> {
  const prompt = [
    "Write a concise README.md for a project called holdmybeer.",
    `Source repository: ${input.sourceFullName}`,
    `Publish repository: ${input.publishFullName}`,
    "Output only markdown.",
    "Include: project goal, approach, setup, and first rewrite workflow."
  ].join("\n");

  const fallback = `# holdmybeer\n\nholdmybeer rewrites an existing codebase into a cleaner, more maintainable structure.\n\n## Source\n\n- Original repository: ${input.sourceFullName}\n- Rewrite repository: ${input.publishFullName}\n\n## Approach\n\n1. Analyze the original repository structure.\n2. Apply deterministic cleanup and refactors.\n3. Produce incremental, reviewable commits.\n\n## Setup\n\n\`\`\`bash\nyarn install\nyarn dev rewrite . --dry-run\n\`\`\`\n`;

  return context.inferText({
    providerPriority: ["claude", "codex"],
    prompt,
    fallbackText: fallback
  });
}
