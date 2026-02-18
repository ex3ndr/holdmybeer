import { writeFile } from "node:fs/promises";
import path from "node:path";
import { aiReadmeGenerate } from "@/modules/ai/aiReadmeGenerate.js";
import { beerOriginalPathResolve } from "@/modules/beer/beerOriginalPathResolve.js";
import { beerSettingsPathResolve } from "@/modules/beer/beerSettingsPathResolve.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";
import { beerSettingsWrite } from "@/modules/beer/beerSettingsWrite.js";
import { contextGetOrInitialize } from "@/modules/context/contextGetOrInitialize.js";
import { gitRepoCheckout } from "@/modules/git/gitRepoCheckout.js";
import { gitRemoteEnsure } from "@/modules/git/gitRemoteEnsure.js";
import { githubCliEnsure } from "@/modules/github/githubCliEnsure.js";
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
import { generateCommit } from "@/workflows/steps/generateCommit.js";
import { pushMain } from "@/workflows/steps/pushMain.js";
import { text, textFormat, beerLog } from "@text";

/**
 * Runs the interactive bootstrap flow for holdmybeer.
 */
export async function bootstrap(projectPath: string): Promise<void> {
  beerLog("bootstrap_start");
  const context = await contextGetOrInitialize(projectPath);
  const showInferenceProgress = true;
  beerLog("bootstrap_github_check");
  await githubCliEnsure();

  const settingsPath = beerSettingsPathResolve();
  const settings = await beerSettingsRead(settingsPath);
  beerLog("bootstrap_settings_loaded", { path: settingsPath });

  const detectedProviders = context.providers;
  settings.providers = detectedProviders;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);
  beerLog("bootstrap_settings_saved", { path: settingsPath });

  const availableProviders = detectedProviders.filter((provider) => provider.available);
  const availableProviderNames = availableProviders
    .map((provider) => provider.id)
    .join(", ");
  beerLog("bootstrap_detected_providers", { providers: availableProviderNames || "none" });
  const availableModels = availableProviders
    .flatMap((provider) => provider.models ?? [])
    .map((model) => model.id)
    .join(", ");
  beerLog("bootstrap_detected_models", { models: availableModels || "none" });

  if (!settings.sourceRepo) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sourceInput = await promptInput(
        text["prompt_source_repo"]!,
        undefined
      );
      const parsed = githubRepoParse(sourceInput);
      if (!parsed) {
        beerLog("bootstrap_invalid_repo");
        continue;
      }

      const exists = await githubRepoExists(parsed.fullName);
      if (!exists) {
        beerLog("bootstrap_repo_not_found", { repo: parsed.fullName });
        continue;
      }

      settings.sourceRepo = parsed;
      settings.updatedAt = Date.now();
      await beerSettingsWrite(settingsPath, settings);
      beerLog("bootstrap_settings_saved", { path: settingsPath });
      beerLog("bootstrap_source_selected", { repo: settings.sourceRepo.fullName });
      break;
    }
  } else {
    beerLog("bootstrap_skipping_source", { repo: settings.sourceRepo.fullName });
    beerLog("bootstrap_source_selected", { repo: settings.sourceRepo.fullName });
  }

  const source = settings.sourceRepo;

  if (!settings.publishRepo) {
    const viewerLogin = await githubViewerGet();
    const ownerChoices = await githubOwnerChoicesGet(viewerLogin);
    beerLog("bootstrap_publish_owners", { owners: ownerChoices.join(", ") });

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

    if (resolvedPublish.repo !== requestedRepoName) {
      beerLog("bootstrap_repo_collision", {
        requested: `${publishOwner}/${requestedRepoName}`,
        resolved: resolvedPublish.fullName
      });
    }

    if (resolvedPublish.status === "missing") {
      const createRepo = await promptConfirm(
        textFormat(text["prompt_create_repo"]!, { repo: resolvedPublish.fullName }),
        true
      );
      if (!createRepo) {
        throw new Error(text["error_bootstrap_cancelled"]!);
      }

      const isPrivate = await promptConfirm(text["prompt_create_private"]!, true);
      beerLog("bootstrap_repo_creating", {
        repo: resolvedPublish.fullName,
        visibility: isPrivate ? "private" : "public"
      });
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
    beerLog("bootstrap_settings_saved", { path: settingsPath });
    beerLog("bootstrap_publish_selected", { repo: settings.publishRepo.fullName });
  } else {
    beerLog("bootstrap_skipping_publish", { repo: settings.publishRepo.fullName });
    beerLog("bootstrap_publish_selected", { repo: settings.publishRepo.fullName });
  }

  const originalCheckoutPath = beerOriginalPathResolve(context.projectPath);
  const sourceRemoteUrl = githubRepoUrlBuild(settings.sourceRepo.fullName);
  beerLog("bootstrap_original_checkout_start");
  const sourceCommitHash = await gitRepoCheckout(sourceRemoteUrl, originalCheckoutPath);
  settings.sourceCommitHash = sourceCommitHash;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);
  beerLog("bootstrap_original_checkout", { path: originalCheckoutPath });

  beerLog("bootstrap_readme_generating");
  const readme = await aiReadmeGenerate(context, {
    sourceFullName: settings.sourceRepo.fullName,
    publishFullName: settings.publishRepo.fullName,
    originalCheckoutPath
  }, {
    showProgress: showInferenceProgress
  });
  await writeFile(path.join(context.projectPath, "README.md"), `${readme.text.trim()}\n`, "utf-8");
  beerLog("bootstrap_readme_generated", { provider: readme.provider ?? "unknown" });

  beerLog("bootstrap_commit_generating");
  const commitMessageGenerated = await generateCommit(
    settings.sourceRepo.fullName,
    { showProgress: showInferenceProgress }
  );
  beerLog("bootstrap_commit_ready", { message: commitMessageGenerated.text });

  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);
  beerLog("bootstrap_settings_saved", { path: settingsPath });

  const publishRemoteUrl = githubRepoUrlBuild(settings.publishRepo.fullName);
  beerLog("bootstrap_remote_ensuring", { url: publishRemoteUrl });
  await gitRemoteEnsure(publishRemoteUrl, context.projectPath);
  beerLog("bootstrap_commit_creating");
  beerLog("bootstrap_push_start", { remote: "origin", branch: "main" });
  const pushResult = await pushMain(commitMessageGenerated.text, {
    showProgress: showInferenceProgress,
    remote: "origin",
    branch: "main"
  });
  const committed = pushResult.committed;
  if (!committed) {
    beerLog("bootstrap_no_changes");
  } else {
    beerLog("bootstrap_commit_created");
  }
  beerLog("bootstrap_push_done");
  beerLog("bootstrap_gitignore_provider", { provider: pushResult.provider ?? "unknown" });

  beerLog("bootstrap_source_repo", { repo: settings.sourceRepo.fullName });
  beerLog("bootstrap_publish_repo", { repo: settings.publishRepo.fullName });
  beerLog("bootstrap_settings_path", { path: settingsPath });
  beerLog("bootstrap_readme_provider", { provider: readme.provider ?? "unknown" });
  beerLog("bootstrap_commit_provider", { provider: commitMessageGenerated.provider ?? "unknown" });
  beerLog("bootstrap_commit_message", { message: commitMessageGenerated.text });
}
