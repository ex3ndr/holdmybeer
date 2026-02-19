import path from "node:path";

/**
 * Returns true when paths are equal or one is a parent directory of the other.
 * Expects: paths target the same root namespace (typically repository-relative paths).
 */
export function pathLockOverlap(pathA: string, pathB: string): boolean {
    const normalizedA = pathLockPathNormalize(pathA);
    const normalizedB = pathLockPathNormalize(pathB);

    return (
        normalizedA === normalizedB ||
        normalizedB.startsWith(`${normalizedA}/`) ||
        normalizedA.startsWith(`${normalizedB}/`)
    );
}

/**
 * Finds existing locked paths that conflict with candidate lock paths.
 * Expects: returns normalized existing lock paths with deduplicated conflicts.
 */
export function pathLockConflicts(newPaths: string[], locked: string[]): string[] {
    const normalizedNewPaths = newPaths.map((candidate) => pathLockPathNormalize(candidate));
    const normalizedLockedPaths = locked.map((candidate) => pathLockPathNormalize(candidate));
    const conflicts = new Set<string>();

    for (const newPath of normalizedNewPaths) {
        for (const lockedPath of normalizedLockedPaths) {
            if (pathLockOverlap(newPath, lockedPath)) {
                conflicts.add(lockedPath);
            }
        }
    }

    return [...conflicts];
}

function pathLockPathNormalize(pathValue: string): string {
    const forwardSlashPath = pathValue.replaceAll("\\", "/");
    const normalized = path.posix.normalize(forwardSlashPath);

    if (normalized === "/") {
        return normalized;
    }

    if (!normalized.endsWith("/")) {
        return normalized;
    }

    return normalized.slice(0, -1);
}
