import { writeFile } from "node:fs/promises";
import { aiCommitMessageGenerate } from "../ai/aiCommitMessageGenerate.js";
import { aiReadmeGenerate } from "../ai/aiReadmeGenerate.js";
import { beerSettingsPathResolve } from "../beer/beerSettingsPathResolve.js";
import { beerSettingsRead } from "../beer/beerSettingsRead.js";
import { beerSettingsWrite } from "../beer/beerSettingsWrite.js";
import { gitCommitCreate } from "../git/gitCommitCreate.js";
import { gitPush } from "../git/gitPush.js";
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
import { providerDetect } from "../providers/providerDetect.js";
import { providerPriorityList } from "../providers/providerPriorityList.js";

/**
 * Runs the interactive bootstrap flow for holdmybeer.
 */
export async function bootstrapRun(): Promise<void> {
  await githubCliEnsure();

  const settingsPath = beerSettingsPathResolve();
  const settings = await beerSettingsRead(settingsPath);

  const detectedProviders = await providerDetect();
  settings.providers = detectedProviders;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const availableProviderNames = detectedProviders
    .filter((provider) => provider.available)
    .map((provider) => provider.id)
    .join(", ");
  console.log(`[daycare] detected providers: ${availableProviderNames || "none"}`);

  let source = settings.sourceRepo;
  while (!source) {
    const sourceInput = await promptInput(
      "Repository to rewrite (GitHub URL or owner/repo)",
      settings.sourceRepo?.fullName
    );
    const parsed = githubRepoParse(sourceInput);
    if (!parsed) {
      console.log("[daycare] invalid repository format. Try owner/repo or a GitHub URL.");
      continue;
    }

    const exists = await githubRepoExists(parsed.fullName);
    if (!exists) {
      console.log(`[daycare] repository not found or inaccessible: ${parsed.fullName}`);
      continue;
    }

    source = parsed;
  }

  settings.sourceRepo = source;
  settings.updatedAt = Date.now();
  await beerSettingsWrite(settingsPath, settings);

  const viewerLogin = await githubViewerGet();
  const ownerChoices = await githubOwnerChoicesGet(viewerLogin);
  console.log(`[daycare] publish owner options: ${ownerChoices.join(", ")}`);

  const publishOwner = await promptInput("Publish owner/org", viewerLogin);
  const defaultRepoName = `${source.repo}-holdmybeer`;
  const requestedRepoName = await promptInput(
    "Publish repository name",
    settings.publishRepo?.repo ?? defaultRepoName
  );

  const resolvedPublish = await githubRepoNameResolve({
    owner: publishOwner,
    requestedRepo: requestedRepoName,
    statusGet: githubRepoStatusGet
  });

  if (resolvedPublish.repo !== requestedRepoName) {
    console.log(
      `[daycare] ${publishOwner}/${requestedRepoName} already contains code; using ${resolvedPublish.fullName}`
    );
  }

  if (resolvedPublish.status === "missing") {
    const createRepo = await promptConfirm(
      `Repository ${resolvedPublish.fullName} does not exist. Create it now?`,
      true
    );
    if (!createRepo) {
      throw new Error("Bootstrap cancelled: publish repository is required.");
    }

    const isPrivate = await promptConfirm("Create as private repository?", true);
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

  const providers = providerPriorityList(settings.providers);
  const readme = await aiReadmeGenerate(providers, {
    sourceFullName: settings.sourceRepo.fullName,
    publishFullName: settings.publishRepo.fullName
  });
  await writeFile("README.md", `${readme.text.trim()}\n`, "utf-8");

  const commitMessageGenerated = await aiCommitMessageGenerate(
    providers,
    settings.sourceRepo.fullName
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
    console.log("[daycare] no changes to commit");
  }

  await gitPush("origin", "main");

  console.log(`[daycare] source repo: ${settings.sourceRepo.fullName}`);
  console.log(`[daycare] publish repo: ${settings.publishRepo.fullName}`);
  console.log(`[daycare] settings: ${settingsPath}`);
  console.log(`[daycare] README provider: ${readme.provider ?? "fallback"}`);
  console.log(`[daycare] commit message: ${commitMessageGenerated.text}`);
}
