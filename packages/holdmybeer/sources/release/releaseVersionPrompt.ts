import { text, textFormatKey } from "@text";
import { promptInput } from "@/modules/prompt/promptInput.js";
import {
  releaseVersionIncrement,
  type ReleaseVersionIncrementKind
} from "@/release/releaseVersionIncrement.js";

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

type ReleaseVersionMode = ReleaseVersionIncrementKind | "custom";

/**
 * Resolves the next package version using patch/minor/major/custom mode.
 * Expects: currentVersion is a valid semantic version.
 */
export async function releaseVersionPrompt(
  currentVersion: string,
  modeArg?: string,
  customVersionArg?: string
): Promise<string> {
  const nextVersions = {
    patch: releaseVersionIncrement(currentVersion, "patch"),
    minor: releaseVersionIncrement(currentVersion, "minor"),
    major: releaseVersionIncrement(currentVersion, "major")
  };

  const mode = await releaseVersionModeResolve(modeArg, nextVersions.patch);
  if (mode !== "custom") {
    return nextVersions[mode];
  }

  const customVersion = await releaseVersionCustomResolve(
    customVersionArg,
    nextVersions.patch
  );
  const normalizedVersion = customVersion.trim();

  if (!SEMVER_PATTERN.test(normalizedVersion)) {
    throw new Error(
      textFormatKey("error_release_version_invalid", {
        version: normalizedVersion
      })
    );
  }

  if (normalizedVersion === currentVersion) {
    throw new Error(text["error_release_version_same"]!);
  }

  return normalizedVersion;
}

async function releaseVersionModeResolve(
  modeArg: string | undefined,
  patchVersion: string
): Promise<ReleaseVersionMode> {
  if (!modeArg && !process.stdin.isTTY) {
    throw new Error(text["error_release_mode_required_non_tty"]!);
  }

  const modeInput =
    modeArg?.trim().toLowerCase() ||
    (await promptInput(
      textFormatKey("prompt_release_mode", { patch: patchVersion }),
      "patch"
    ))
      .trim()
      .toLowerCase();

  if (!releaseVersionModeIsValid(modeInput)) {
    throw new Error(textFormatKey("error_release_mode_invalid", { mode: modeInput }));
  }

  return modeInput;
}

async function releaseVersionCustomResolve(
  customVersionArg: string | undefined,
  patchVersion: string
): Promise<string> {
  const value =
    customVersionArg?.trim() ||
    (await promptInput(text["prompt_release_custom"]!, patchVersion)).trim();

  if (!value) {
    throw new Error(text["error_release_custom_missing"]!);
  }

  return value;
}

function releaseVersionModeIsValid(value: string): value is ReleaseVersionMode {
  return value === "patch" || value === "minor" || value === "major" || value === "custom";
}
