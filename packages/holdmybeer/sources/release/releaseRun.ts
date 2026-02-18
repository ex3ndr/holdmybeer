import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beerLog, text } from "@text";
import { commandRun } from "@/modules/util/commandRun.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, "../..");
const repositoryDirectory = resolve(packageDirectory, "../..");
const npmRegistry = "https://registry.npmjs.org/";

/**
 * Runs the holdmybeer publish flow from repository root.
 * Expects: clean git working tree and npm credentials already configured.
 */
export async function releaseRun(): Promise<void> {
  beerLog("release_start");
  await releaseWorkingTreeAssertClean();
  beerLog("release_git_clean");

  beerLog("release_install");
  await releaseCommandRun("yarn", ["install", "--frozen-lockfile"], repositoryDirectory);

  beerLog("release_test");
  await releaseCommandRun("yarn", ["test"], repositoryDirectory);

  beerLog("release_build");
  await releaseCommandRun("yarn", ["build"], repositoryDirectory);

  beerLog("release_publish");
  await releaseCommandRun(
    "npm",
    ["publish", "--access", "public", "--registry", npmRegistry, "--no-package-lock"],
    packageDirectory,
    releaseNpmEnv()
  );

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

function releaseNpmEnv(): Record<string, string> {
  return {
    npm_config_package_lock: "false",
    NPM_CONFIG_PACKAGE_LOCK: "false"
  };
}

await releaseRun();
