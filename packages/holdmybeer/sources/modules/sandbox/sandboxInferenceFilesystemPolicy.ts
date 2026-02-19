import os from "node:os";
import path from "node:path";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";

const COMMON_HOME_RELATIVE_DENY_PATHS = [
    ".ssh",
    ".gnupg",
    ".aws",
    ".kube",
    ".docker",
    ".config/gcloud",
    ".config/op",
    ".config/1Password",
    ".local/share/keyrings",
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".git-credentials"
];

const COMMON_SYSTEM_DENY_PATHS = [
    "/etc/ssh",
    "/etc/sudoers",
    "/etc/sudoers.d",
    "/etc/shadow",
    "/etc/gshadow",
    "/etc/ssl/private"
];

const DARWIN_HOME_RELATIVE_DENY_PATHS = [
    "Library/Application Support/iCloud",
    "Library/Application Support/com.apple.TCC",
    "Library/Group Containers"
];

const DARWIN_SYSTEM_DENY_PATHS = [
    "/private/etc/ssh",
    "/private/etc/sudoers",
    "/private/etc/sudoers.d",
    "/private/etc/master.passwd"
];

const LINUX_SYSTEM_DENY_PATHS = ["/root/.ssh"];

export interface SandboxInferenceFilesystemPolicyInput {
    writePolicy?: InferenceWritePolicy;
    projectPath?: string;
    homeDir?: string;
    platform?: NodeJS.Platform;
}

export interface SandboxInferenceFilesystemPolicy {
    denyRead: string[];
    allowWrite: string[];
    denyWrite: string[];
}

/**
 * Builds per-call filesystem policy for inference execution.
 * Expects: writePolicy paths are project-relative or absolute host paths.
 */
export function sandboxInferenceFilesystemPolicy(
    input: SandboxInferenceFilesystemPolicyInput = {}
): SandboxInferenceFilesystemPolicy {
    const platform = input.platform ?? process.platform;
    const homeDir = path.resolve(input.homeDir ?? os.homedir());

    const homeDeny = COMMON_HOME_RELATIVE_DENY_PATHS.map((entry) => path.resolve(homeDir, entry));
    const platformHomeDeny =
        platform === "darwin" ? DARWIN_HOME_RELATIVE_DENY_PATHS.map((entry) => path.resolve(homeDir, entry)) : [];
    const platformSystemDeny =
        platform === "darwin" ? DARWIN_SYSTEM_DENY_PATHS : platform === "linux" ? LINUX_SYSTEM_DENY_PATHS : [];
    const denyRead = dedupeResolvedPaths([
        ...homeDeny,
        ...platformHomeDeny,
        ...COMMON_SYSTEM_DENY_PATHS,
        ...platformSystemDeny
    ]);

    return {
        denyRead,
        allowWrite: allowWriteResolve(input.writePolicy, homeDir, projectPathResolve(input.projectPath)),
        // Keep read/write denials aligned to prevent both access and tampering.
        denyWrite: [...denyRead]
    };
}

function allowWriteResolve(
    writePolicy: InferenceWritePolicy | undefined,
    homeDir: string,
    projectPath: string
): string[] {
    const authPaths = [path.resolve(homeDir, ".pi")];
    const localPiPaths = [path.resolve(projectPath, ".pi")];

    if (!writePolicy || writePolicy.mode === "read-only") {
        // Provider CLIs need writable auth state and project-local settings lock.
        return dedupeResolvedPaths([...authPaths, ...localPiPaths]);
    }

    return dedupeResolvedPaths([
        ...writePolicy.writablePaths.map((entry) => path.resolve(projectPath, entry)),
        ...authPaths,
        ...localPiPaths
    ]);
}

function projectPathResolve(projectPath: string | undefined): string {
    const envProjectPath = process.env.BEER_PROJECT_PATH;
    if (projectPath && projectPath.trim().length > 0) {
        return path.resolve(projectPath);
    }
    if (envProjectPath && envProjectPath.trim().length > 0) {
        return path.resolve(envProjectPath);
    }
    return pathResolveFromInitCwd(".");
}

function dedupeResolvedPaths(values: string[]): string[] {
    const resolved = values
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => path.resolve(entry));
    return Array.from(new Set(resolved));
}
