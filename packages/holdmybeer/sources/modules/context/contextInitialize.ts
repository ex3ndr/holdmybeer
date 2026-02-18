import { generateText } from "@/modules/ai/generateText.js";
import { gitStageAndCommit } from "@/modules/git/gitStageAndCommit.js";
import { providerDetect } from "@/modules/providers/providerDetect.js";
import type { Context } from "@/modules/context/contextTypes.js";

/**
 * Detects providers once and creates the global Context object.
 * Expects: projectPath is the root directory for all git operations.
 */
export async function contextInitialize(projectPath: string): Promise<Context> {
  const providers = await providerDetect();

  const context: Context = {
    projectPath,
    providers,
    inferText: (input) =>
      generateText(context, input.prompt, {
        providerPriority: input.providerPriority,
        showProgress: input.showProgress,
        writePolicy: input.writePolicy
      }),
    stageAndCommit: (message) => gitStageAndCommit(message, projectPath)
  };

  globalThis.Context = context;
  return context;
}
