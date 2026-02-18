import { beerSettingsPathResolve } from "@/modules/beer/beerSettingsPathResolve.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";

/**
 * Detects whether bootstrap completed enough to unlock non-bootstrap workflows.
 * Expects: settings file may not exist yet; missing fields mean not bootstrapped.
 */
export async function workflowBootstrappedResolve(): Promise<boolean> {
  const settings = await beerSettingsRead(beerSettingsPathResolve());
  return Boolean(
    settings.sourceRepo &&
    settings.publishRepo &&
    settings.sourceCommitHash
  );
}
