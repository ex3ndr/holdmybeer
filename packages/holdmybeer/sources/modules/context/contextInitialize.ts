import { generateText } from "@/modules/ai/generateText.js";
import { gitStageAndCommit } from "@/modules/git/gitStageAndCommit.js";
import { providerDetect } from "@/modules/providers/providerDetect.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";
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
    inferText: async (input) => {
      const onMessage = input.showProgress
        ? (message: string) => {
            console.log(message);
          }
        : undefined;
      const sandbox = await sandboxInferenceGet({
        writePolicy: input.writePolicy
      });

      return generateText(
        providers,
        input.providerPriority,
        input.prompt,
        {
          onMessage,
          sandbox,
          writePolicy: input.writePolicy
        }
      );
    },
    stageAndCommit: (message) => gitStageAndCommit(message, projectPath)
  };

  globalThis.Context = context;
  return context;
}
