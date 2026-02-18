import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beerLog, text } from "@text";
import { commandRun } from "@/modules/util/commandRun.js";
import { releaseVersionPrompt } from "@/release/releaseVersionPrompt.js";

type PackageManifest = {
  version?: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, "../..");
const repositoryDirectory = resolve(packageDirectory, "../..");
const packageManifestPath = resolve(packageDirectory, "package.json");
const packageManifestRelativePath = "packages/holdmybeer/package.json";
const npmRegistry = "https://registry.npmjs.org/";

/**
 * Runs the holdmybeer publish flow from repository root.
 * Expects: clean git working tree and npm credentials already configured.
 */
export async function releaseRun(): Promise<void> {
  beerLog("release_start");
  await releaseWorkingTreeAssertClean();
  beerLog("release_git_clean");
  const currentVersion = releasePackageVersionRead();
  const nextVersion = await releaseVersionPrompt(
    currentVersion,
    process.argv[2],
    process.argv[3]
  );
  const commitMessage = `chore(release): holdmybeer ${nextVersion}`;
  const tagName = `holdmybeer@${nextVersion}`;
  let releaseCommitHash: string | null = null;
  let tagCreated = false;

  beerLog("release_version_current", { version: currentVersion });
  beerLog("release_version_selected", { version: nextVersion });
  await releaseTagMissingAssert(tagName);

  try {
    beerLog("release_install");
    await releaseCommandRun("yarn", ["install", "--frozen-lockfile"], repositoryDirectory);

    beerLog("release_version_bump", { version: nextVersion });
    await releaseCommandRun(
      "npm",
      [
        "version",
        nextVersion,
        "--no-git-tag-version",
        "--registry",
        npmRegistry,
        "--no-package-lock"
      ],
      packageDirectory,
      releaseNpmEnv()
    );

    beerLog("release_commit_creating", { version: nextVersion });
    await releaseCommandRun("git", ["add", packageManifestRelativePath], repositoryDirectory);
    await releaseCommandRun("git", ["commit", "-m", commitMessage], repositoryDirectory);
    releaseCommitHash = await releaseCommandOutput(
      "git",
      ["rev-parse", "HEAD"],
      repositoryDirectory
    );

    beerLog("release_test");
    await releaseCommandRun("yarn", ["test"], repositoryDirectory);

    beerLog("release_build");
    await releaseCommandRun("yarn", ["build"], repositoryDirectory);

    beerLog("release_tag_creating", { tag: tagName });
    await releaseCommandRun("git", ["tag", tagName], repositoryDirectory);
    tagCreated = true;

    await releasePublish();
  } catch (error) {
    await releaseRollback(releaseCommitHash, tagName, tagCreated);
    throw error;
  }

  beerLog("release_push_commit");
  await releaseCommandRun("git", ["push", "origin", "HEAD"], repositoryDirectory);
  beerLog("release_push_tag", { tag: tagName });
  await releaseCommandRun("git", ["push", "origin", tagName], repositoryDirectory);

  beerLog("release_done");
}

async function releaseWorkingTreeAssertClean(): Promise<void> {
  const status = await commandRun("git", ["status", "--porcelain"], {
    cwd: repositoryDirectory
  });
  if (status.stdout.trim().length > 0) {
    throw new Error(text["error_release_git_dirty"]!);
  }
}

function releasePackageVersionRead(): string {
  const raw = readFileSync(packageManifestPath, "utf8");
  const parsed = JSON.parse(raw) as PackageManifest;
  const version = parsed.version?.trim();
  if (!version) {
    throw new Error(text["error_release_version_missing"]!);
  }
  return version;
}

async function releaseTagMissingAssert(tagName: string): Promise<void> {
  const output = await releaseCommandOutput(
    "git",
    ["tag", "--list", "--format=%(refname:strip=2)", tagName],
    repositoryDirectory
  );
  if (output.split("\n").some((line) => line.trim() === tagName)) {
    throw new Error(text["error_release_tag_exists"]!);
  }
}

async function releaseCommandRun(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {}
): Promise<void> {
  await commandRun(command, args, {
    cwd,
    env,
    onStdoutText: (line) => process.stdout.write(line),
    onStderrText: (line) => process.stderr.write(line)
  });
}

async function releaseCommandOutput(
  command: string,
  args: string[],
  cwd: string
): Promise<string> {
  const result = await commandRun(command, args, {
    cwd,
    onStderrText: (line) => process.stderr.write(line)
  });
  return result.stdout.trim();
}

function releaseNpmEnv(): Record<string, string> {
  return {
    npm_config_package_lock: "false",
    NPM_CONFIG_PACKAGE_LOCK: "false"
  };
}

async function releaseRollback(
  releaseCommitHash: string | null,
  tagName: string,
  tagCreated: boolean
): Promise<void> {
  if (!releaseCommitHash) {
    return;
  }

  beerLog("release_rollback_start");
  if (tagCreated) {
    beerLog("release_rollback_tag", { tag: tagName });
    await releaseCommandRun("git", ["tag", "-d", tagName], repositoryDirectory);
  }
  beerLog("release_rollback_commit");
  await releaseCommandRun("git", ["reset", "--hard", `${releaseCommitHash}^`], repositoryDirectory);
}

async function releasePublish(): Promise<void> {
  beerLog("release_publish");
  const publishArgs = [
    "publish",
    "--access",
    "public",
    "--registry",
    npmRegistry,
    "--no-package-lock"
  ];
  await releaseCommandRunInteractive("npm", publishArgs, packageDirectory, releaseNpmEnv());
}

async function releaseCommandRunInteractive(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {}
): Promise<void> {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...env }
    });

    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    throw new Error(
      `Command failed (${exitCode}): ${command} ${args.join(" ")}`
    );
  }
}

await releaseRun();
