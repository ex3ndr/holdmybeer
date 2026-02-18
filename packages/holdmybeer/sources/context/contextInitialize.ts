import { aiTextGenerate } from "../ai/aiTextGenerate.js";
import { gitStageAndCommit } from "../git/gitStageAndCommit.js";
import { providerDetect } from "../providers/providerDetect.js";
import { sandboxInferenceGet } from "../sandbox/sandboxInferenceGet.js";
import type { Context } from "./contextTypes.js";

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

      return aiTextGenerate(
        providers,
        input.providerPriority,
        input.prompt,
        input.fallbackText,
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
