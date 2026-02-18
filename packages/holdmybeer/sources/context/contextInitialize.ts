import { aiTextGenerate } from "../ai/aiTextGenerate.js";
import { providerDetect } from "../providers/providerDetect.js";
import type { Context } from "./contextTypes.js";

/**
 * Detects providers once and creates the global Context object.
 */
export async function contextInitialize(): Promise<Context> {
  const providers = await providerDetect();

  const context: Context = {
    providers,
    inferText: async (input) => {
      const onMessage = input.showProgress
        ? (message: string) => {
            console.log(message);
          }
        : undefined;

      return aiTextGenerate(
        providers,
        input.providerPriority,
        input.prompt,
        input.fallbackText,
        {
          onMessage,
          readOnly: true
        }
      );
    }
  };

  globalThis.Context = context;
  return context;
}
