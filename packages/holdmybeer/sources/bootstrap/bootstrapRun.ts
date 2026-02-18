import { writeFile } from "node:fs/promises";
import { aiCommitMessageGenerate } from "../ai/aiCommitMessageGenerate.js";
import { aiReadmeGenerate } from "../ai/aiReadmeGenerate.js";
import { beerOriginalPathResolve } from "../beer/beerOriginalPathResolve.js";
import { beerSettingsPathResolve } from "../beer/beerSettingsPathResolve.js";
import { beerSettingsRead } from "../beer/beerSettingsRead.js";
import { beerSettingsWrite } from "../beer/beerSettingsWrite.js";
import { contextGetOrInitialize } from "../context/contextGetOrInitialize.js";
import { gitCommitCreate } from "../git/gitCommitCreate.js";
import { gitPush } from "../git/gitPush.js";
import { gitRepoCheckout } from "../git/gitRepoCheckout.js";
import { gitRemoteEnsure } from "../git/gitRemoteEnsure.js";
import { githubCliEnsure } from "../github/githubCliEnsure.js";
import { githubOwnerChoicesGet } from "../github/githubOwnerChoicesGet.js";
import { githubRepoCreate } from "../github/githubRepoCreate.js";
import { githubRepoExists } from "../github/githubRepoExists.js";
import { githubRepoNameResolve } from "../github/githubRepoNameResolve.js";
import { githubRepoParse } from "../github/githubRepoParse.js";
import { githubRepoStatusGet } from "../github/githubRepoStatusGet.js";
import { githubRepoUrlBuild } from "../github/githubRepoUrlBuild.js";
import { githubViewerGet } from "../github/githubViewerGet.js";
import { promptConfirm } from "../prompt/promptConfirm.js";
import { promptInput } from "../prompt/promptInput.js";
import { text, textFormat, beerLog } from "@text";

/**
 * Runs the interactive bootstrap flow for holdmybeer.
 */
export async function bootstrapRun(): Promise<void> {
  const context = await contextGetOrInitialize();
  const showInferenceProgress = true;
  await githubCliEnsure();

  const settingsPath = beerSettingsPathResolve();
  const settings = await beerSettingsRead(settingsPath);

  const detectedProviders = context.providers;
  settings.providers = detectedProviders;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const availableProviderNames = detectedProviders
    .filter((provider) => provider.available)
    .map((provider) => provider.id)
    .join(", ");
  beerLog("bootstrap_detected_providers", { providers: availableProviderNames || "none" });

  let source = settings.sourceRepo;
  while (!source) {
    const sourceInput = await promptInput(
      text["prompt_source_repo"]!,
      settings.sourceRepo?.fullName
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

    source = parsed;
  }

  settings.sourceRepo = source;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const viewerLogin = await githubViewerGet();
  const ownerChoices = await githubOwnerChoicesGet(viewerLogin);
  beerLog("bootstrap_publish_owners", { owners: ownerChoices.join(", ") });

  const publishOwner = await promptInput(text["prompt_publish_owner"]!, viewerLogin);
  const defaultRepoName = `${source.repo}-holdmybeer`;
  const requestedRepoName = await promptInput(
    text["prompt_publish_repo_name"]!,
    settings.publishRepo?.repo ?? defaultRepoName
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

  const originalCheckoutPath = beerOriginalPathResolve();
  const sourceRemoteUrl = githubRepoUrlBuild(settings.sourceRepo.fullName);
  await gitRepoCheckout(sourceRemoteUrl, originalCheckoutPath);

  const readme = await aiReadmeGenerate(context, {
    sourceFullName: settings.sourceRepo.fullName,
    publishFullName: settings.publishRepo.fullName,
    originalCheckoutPath
  }, {
    showProgress: showInferenceProgress
  });
  await writeFile("README.md", `${readme.text.trim()}\n`, "utf-8");

  const commitMessageGenerated = await aiCommitMessageGenerate(
    context,
    settings.sourceRepo.fullName,
    {
      showProgress: showInferenceProgress
    }
  );

  settings.readmeProvider = readme.provider;
  settings.commitMessageProvider = commitMessageGenerated.provider;
  settings.commitMessage = commitMessageGenerated.text;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const publishRemoteUrl = githubRepoUrlBuild(settings.publishRepo.fullName);
  await gitRemoteEnsure(publishRemoteUrl);
  const committed = await gitCommitCreate(commitMessageGenerated.text);
  if (!committed) {
    beerLog("bootstrap_no_changes");
  }

  await gitPush("origin", "main");

  beerLog("bootstrap_source_repo", { repo: settings.sourceRepo.fullName });
  beerLog("bootstrap_publish_repo", { repo: settings.publishRepo.fullName });
  beerLog("bootstrap_settings_path", { path: settingsPath });
  beerLog("bootstrap_readme_provider", { provider: readme.provider ?? "fallback" });
  beerLog("bootstrap_commit_message", { message: commitMessageGenerated.text });
}
