import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AsyncLock } from "@/modules/util/asyncLock.js";
import { pathLockConflicts } from "@/modules/util/pathLockOverlap.js";

interface PathLockDiskState {
    locked: string[];
}

export interface PathLockResult {
    locked: boolean;
    conflicts: string[];
    release: (() => Promise<void>) | null;
}

/**
 * Coordinates path locks in-memory or through a disk-backed JSON file.
 * Expects: all paths are in the same root namespace (usually repository-relative).
 */
export class PathLock {
    static create(): PathLock {
        return new PathLock();
    }

    static async open(filePath: string): Promise<PathLock> {
        const resolvedFilePath = path.resolve(filePath);
        const lock = new PathLock(resolvedFilePath);
        lock.lockedPaths = new Set(await pathLockRead(resolvedFilePath));
        await lock.sync();
        return lock;
    }

    private readonly stateLock = new AsyncLock();
    private readonly filePath: string | null;
    private lockedPaths: Set<string>;

    private constructor(filePath?: string) {
        this.filePath = filePath ?? null;
        this.lockedPaths = new Set<string>();
    }

    async lock(paths: string[]): Promise<PathLockResult> {
        const normalizedPaths = pathLockPathsNormalize(paths);
        return this.stateLock.inLock(async () => {
            await this.refresh();
            const conflicts = pathLockConflicts(normalizedPaths, [...this.lockedPaths]);
            if (conflicts.length > 0) {
                return {
                    locked: false,
                    conflicts,
                    release: null
                };
            }

            for (const pathValue of normalizedPaths) {
                this.lockedPaths.add(pathValue);
            }
            await this.sync();

            let released = false;
            return {
                locked: true,
                conflicts: [],
                release: async () => {
                    await this.stateLock.inLock(async () => {
                        if (released) {
                            return;
                        }
                        await this.refresh();
                        released = true;
                        for (const pathValue of normalizedPaths) {
                            this.lockedPaths.delete(pathValue);
                        }
                        await this.sync();
                    });
                }
            };
        });
    }

    private async sync(): Promise<void> {
        if (!this.filePath) {
            return;
        }
        await pathLockWrite(this.filePath, [...this.lockedPaths]);
    }

    private async refresh(): Promise<void> {
        if (!this.filePath) {
            return;
        }
        this.lockedPaths = new Set(await pathLockRead(this.filePath));
    }
}

function pathLockErrorIsNotFound(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function pathLockPathsNormalize(paths: string[]): string[] {
    const normalized = new Set<string>();
    for (const pathValue of paths) {
        normalized.add(pathLockPathNormalize(pathValue));
    }
    return [...normalized];
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

async function pathLockRead(filePath: string): Promise<string[]> {
    try {
        const raw = await readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw) as PathLockDiskState;
        if (!parsed || !Array.isArray(parsed.locked)) {
            throw new Error(`Invalid path lock file: ${filePath}`);
        }
        return pathLockPathsNormalize(parsed.locked);
    } catch (error) {
        if (pathLockErrorIsNotFound(error)) {
            return [];
        }
        throw error;
    }
}

async function pathLockWrite(filePath: string, locked: string[]): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now().toString(36)}.tmp`;
    const body = JSON.stringify({
        locked: pathLockPathsNormalize(locked).sort()
    });

    try {
        await writeFile(tempPath, body, "utf-8");
        await rename(tempPath, filePath);
    } finally {
        await rm(tempPath, { force: true });
    }
}
