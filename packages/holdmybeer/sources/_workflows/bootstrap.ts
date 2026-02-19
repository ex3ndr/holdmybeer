import { writeFile } from "node:fs/promises";
import path from "node:path";
import { aiReadmeGenerate } from "@/modules/ai/aiReadmeGenerate.js";
import { beerOriginalPathResolve } from "@/modules/beer/beerOriginalPathResolve.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";
import { beerSettingsWrite } from "@/modules/beer/beerSettingsWrite.js";
import { gitRepoCheckout } from "@/modules/git/gitRepoCheckout.js";
import { gitRemoteEnsure } from "@/modules/git/gitRemoteEnsure.js";
import { githubOwnerChoicesGet } from "@/modules/github/githubOwnerChoicesGet.js";
import { githubRepoCreate } from "@/modules/github/githubRepoCreate.js";
import { githubRepoExists } from "@/modules/github/githubRepoExists.js";
import { githubRepoNameResolve } from "@/modules/github/githubRepoNameResolve.js";
import { githubRepoParse } from "@/modules/github/githubRepoParse.js";
import { githubRepoStatusGet } from "@/modules/github/githubRepoStatusGet.js";
import { githubRepoUrlBuild } from "@/modules/github/githubRepoUrlBuild.js";
import { githubViewerGet } from "@/modules/github/githubViewerGet.js";
import { promptConfirm } from "@/modules/prompt/promptConfirm.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import { generateCommit } from "@/_workflows/steps/generateCommit.js";
import { pushMain } from "@/_workflows/steps/pushMain.js";
import { stepProgressStart } from "@/_workflows/steps/stepProgressStart.js";
import type { Context } from "@/types";
import { text, textFormatKey } from "@text";

/**
 * Runs the interactive bootstrap workflow for holdmybeer.
 */
export async function bootstrap(ctx: Context): Promise<void> {
  const showInferenceProgress = true;

  const settingsPath = path.join(ctx.projectPath, ".beer", "settings.json");
  const settings = await beerSettingsRead(settingsPath);

  const detectedProviders = ctx.providers;
  settings.providers = detectedProviders;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  if (!settings.sourceRepo) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sourceInput = await promptInput(
        text["prompt_source_repo"]!,
        undefined
      );
      const parsed = githubRepoParse(sourceInput);
      if (!parsed) {
        continue;
      }

      const exists = await githubRepoExists(parsed.fullName);
      if (!exists) {
        continue;
      }

      settings.sourceRepo = parsed;
      settings.updatedAt = Date.now();
      await beerSettingsWrite(settingsPath, settings);
      break;
    }
  }

  const source = settings.sourceRepo;
  if (!source) {
    throw new Error(text["error_bootstrap_source_required"]!);
  }

  if (!settings.publishRepo) {
    const viewerLogin = await bootstrapProgressRun(
      text["bootstrap_publish_owners_loading"]!,
      () => githubViewerGet()
    );
    await bootstrapProgressRun(
      text["bootstrap_publish_owners_loading"]!,
      async () => githubOwnerChoicesGet(viewerLogin)
    );

    const publishOwner = await promptInput(text["prompt_publish_owner"]!, viewerLogin);
    const defaultRepoName = `${source.repo}-holdmybeer`;
    const requestedRepoName = await promptInput(
      text["prompt_publish_repo_name"]!,
      defaultRepoName
    );

    const resolvedPublish = await githubRepoNameResolve({
      owner: publishOwner,
      requestedRepo: requestedRepoName,
      statusGet: githubRepoStatusGet
    });

    if (resolvedPublish.status === "missing") {
      const createRepo = await promptConfirm(
        textFormatKey("prompt_create_repo", { repo: resolvedPublish.fullName }),
        true
      );
      if (!createRepo) {
        throw new Error(text["error_bootstrap_cancelled"]!);
      }

      const isPrivate = await promptConfirm(text["prompt_create_private"]!, true);
      await githubRepoCreate(resolvedPublish.fullName, isPrivate ? "private" : "public");
    }

    settings.publishRepo = {
      owner: publishOwner,
      repo: resolvedPublish.repo,
      fullName: resolvedPublish.fullName,
      url: `https://github.com/${resolvedPublish.fullName}`
    };
    settings.updatedAt = Date.now();
    await beerSettingsWrite(settingsPath, settings);
  }

  const publishRepo = settings.publishRepo;
  if (!publishRepo) {
    throw new Error(text["error_bootstrap_publish_required"]!);
  }

  const originalCheckoutPath = beerOriginalPathResolve(ctx.projectPath);
  const sourceRemoteUrl = githubRepoUrlBuild(source.fullName);
  const sourceCommitHash = await bootstrapProgressRun(
    text["bootstrap_original_checkout_start"]!,
    () => gitRepoCheckout(sourceRemoteUrl, originalCheckoutPath)
  );
  settings.sourceCommitHash = sourceCommitHash;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const readme = await bootstrapProgressRun(
    text["bootstrap_readme_generating"]!,
    () => aiReadmeGenerate(ctx, {
      sourceFullName: source.fullName,
      publishFullName: publishRepo.fullName,
      originalCheckoutPath
    }, {
      showProgress: showInferenceProgress
    })
  );
  await writeFile(path.join(ctx.projectPath, "README.md"), `${readme.text.trim()}\n`, "utf-8");

  const commitMessageGenerated = await generateCommit(
    source.fullName,
    { showProgress: showInferenceProgress }
  );

  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const publishRemoteUrl = githubRepoUrlBuild(publishRepo.fullName);
  await bootstrapProgressRun(
    textFormatKey("bootstrap_push_start", { remote: "origin", branch: "main" }),
    async () => {
      await gitRemoteEnsure(publishRemoteUrl, ctx.projectPath);
      await pushMain(commitMessageGenerated.text, {
        showProgress: showInferenceProgress,
        remote: "origin",
        branch: "main"
      });
    }
  );
}

async function bootstrapProgressRun<T>(
  message: string,
  operation: () => Promise<T>
): Promise<T> {
  const progress = stepProgressStart(message);
  try {
    const result = await operation();
    progress.done();
    return result;
  } catch (error) {
    progress.fail();
    throw error;
  }
}
