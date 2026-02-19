import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { contextApplyConfig } from "@/_workflows/context/utils/contextApplyConfig.js";
import { contextAskGithubRepo } from "@/_workflows/context/utils/contextAskGithubRepo.js";
import { contextGitignoreEnsure } from "@/_workflows/context/utils/contextGitignoreEnsure.js";
import { type ProgressLine, progressMultilineStart } from "@/_workflows/context/utils/progressMultilineStart.js";
import { beerSettingsRead } from "@/modules/beer/beerSettingsRead.js";
import { gitPush } from "@/modules/git/gitPush.js";
import { gitStageAndCommit } from "@/modules/git/gitStageAndCommit.js";
import { providerDetect } from "@/modules/providers/providerDetect.js";
import type { BeerSettings, GitHubRepoRef, ProviderDetection } from "@/types";

export interface ContextCheckpointOptions {
    remote?: string;
    branch?: string;
}

export interface ContextProgresses {
    add(initialMessage: string): ProgressLine;
    run<T>(initialMessage: string, operation: (report: (message: string) => void) => Promise<T>): Promise<T>;
}

/**
 * Runtime workflow context with repository-aware helpers.
 * Expects: projectPath points to the repository root.
 */
export class Context {
    readonly projectPath: string;
    readonly providers: ProviderDetection[];
    private settingsCurrent: Readonly<BeerSettings>;
    private progressMultiline?: ReturnType<typeof progressMultilineStart>;
    private progressUsers = 0;

    private constructor(projectPath: string, providers: ProviderDetection[], settings: Readonly<BeerSettings>) {
        this.projectPath = projectPath;
        this.providers = providers;
        this.settingsCurrent = contextSettingsReadonly(settings);
    }

    /**
     * Creates Context for the given folder and detects available AI providers.
     * Expects: folder is the repository root or a path inside it.
     */
    static async create(folder: string): Promise<Context> {
        const projectPath = path.resolve(folder);
        const providers = await providerDetect();
        const settingsPath = path.join(projectPath, ".beer", "settings.json");
        const settings = await beerSettingsRead(settingsPath);
        return new Context(projectPath, providers, settings);
    }

    /**
     * Returns current immutable settings snapshot.
     * Expects: settings are updated only via applyConfig().
     */
    get settings(): Readonly<BeerSettings> {
        return this.settingsCurrent;
    }

    /**
     * Returns true when file exists at repository-relative or absolute path.
     * Expects: file is a file path.
     */
    async existFile(file: string): Promise<boolean> {
        try {
            const fileStat = await stat(contextPathResolve(this.projectPath, file));
            return fileStat.isFile();
        } catch {
            return false;
        }
    }

    /**
     * Returns true when directory exists at repository-relative or absolute path.
     * Expects: dir is a directory path.
     */
    async existDir(dir: string): Promise<boolean> {
        try {
            const dirStat = await stat(contextPathResolve(this.projectPath, dir));
            return dirStat.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Writes UTF-8 content to a repository-relative or absolute file path.
     * Expects: parent directories already exist (use makeDirs when needed).
     */
    async writeFile(file: string, contents: string): Promise<void> {
        await writeFile(contextPathResolve(this.projectPath, file), contents, "utf-8");
    }

    /**
     * Creates repository-relative or absolute directories recursively.
     * Expects: dir is a valid directory path.
     */
    async makeDirs(dir: string): Promise<void> {
        await mkdir(contextPathResolve(this.projectPath, dir), { recursive: true });
    }

    /**
     * Stages and commits all current changes in the project repository.
     * Expects: message is a non-empty commit message.
     */
    async stageAndCommit(message: string): Promise<boolean> {
        return gitStageAndCommit(message, this.projectPath);
    }

    /**
     * Stages, commits, and pushes to the configured remote/branch.
     * Expects: repository remote/branch are configured.
     */
    async checkpoint(message?: string, options: ContextCheckpointOptions = {}): Promise<{ committed: boolean }> {
        const messageResolved = message?.trim() || "chore: checkpoint";
        const committed = await this.stageAndCommit(messageResolved);
        const remote = options.remote ?? "origin";
        const branch = options.branch ?? "main";
        await gitPush(remote, branch, this.projectPath);
        return {
            committed
        };
    }

    /**
     * Runs an async operation with spinner progress and report callback.
     * Expects: operation calls report(message) with user-meaningful updates as needed.
     */
    async progress<T>(
        initialMessage: string,
        operation: (report: (message: string) => void) => Promise<T>
    ): Promise<T> {
        const progress = this.progressAcquire();
        const line = progress.add(initialMessage);
        try {
            const result = await operation((message) => {
                line.update(message);
            });
            line.done(contextProgressSuccessMessageResolve(result));
            return result;
        } catch (error) {
            line.fail(contextProgressErrorMessageResolve(error));
            throw error;
        } finally {
            this.progressRelease();
        }
    }

    /**
     * Runs an async operation with dynamic multiline progress where lines can be added on demand.
     * Expects: callers add lines via add()/run() and may execute run() calls in parallel.
     */
    async progresses<T>(operation: (progresses: ContextProgresses) => Promise<T>): Promise<T> {
        const progress = this.progressAcquire();
        const activeLines = new Set<ProgressLine>();

        const addLine = (initialMessage: string): ProgressLine => {
            const line = progress.add(initialMessage);
            let active = true;
            const trackedLine: ProgressLine = {
                update(message: string) {
                    line.update(message);
                },
                done(message?: string) {
                    if (!active) {
                        return;
                    }
                    active = false;
                    activeLines.delete(trackedLine);
                    line.done(message);
                },
                fail(message?: string) {
                    if (!active) {
                        return;
                    }
                    active = false;
                    activeLines.delete(trackedLine);
                    line.fail(message);
                }
            };
            activeLines.add(trackedLine);
            return trackedLine;
        };

        const lineRun = async <R>(
            initialMessage: string,
            lineOperation: (report: (message: string) => void) => Promise<R>
        ): Promise<R> => {
            const line = addLine(initialMessage);
            try {
                const result = await lineOperation((message) => {
                    line.update(message);
                });
                line.done(contextProgressSuccessMessageResolve(result));
                return result;
            } catch (error) {
                line.fail(contextProgressErrorMessageResolve(error));
                throw error;
            }
        };

        try {
            const result = await operation({
                add(initialMessage: string): ProgressLine {
                    return addLine(initialMessage);
                },
                run<R>(
                    initialMessage: string,
                    lineOperation: (report: (message: string) => void) => Promise<R>
                ): Promise<R> {
                    return lineRun(initialMessage, lineOperation);
                }
            });
            for (const line of activeLines) {
                line.done();
            }
            return result;
        } catch (error) {
            const message = contextProgressErrorMessageResolve(error);
            for (const line of activeLines) {
                line.fail(message);
            }
            throw error;
        } finally {
            this.progressRelease();
        }
    }

    /**
     * Prompts for a GitHub repository until it is valid and accessible.
     * Expects: question is a non-empty input prompt.
     */
    async askGithubRepo(question: string, defaultValue?: string): Promise<GitHubRepoRef> {
        return contextAskGithubRepo(question, defaultValue);
    }

    /**
     * Applies settings mutation, updates internal state, and persists to file.
     * Expects: apply mutates the given settings object.
     */
    async applyConfig(apply: (settings: BeerSettings) => void | Promise<void>): Promise<void> {
        const next = await contextApplyConfig(this.projectPath, this.settingsCurrent, apply);
        this.settingsCurrent = contextSettingsReadonly(next);
    }

    /**
     * Ensures each pattern exists in repository .gitignore and appends missing ones.
     * Expects: patterns are raw gitignore entries (e.g. ".beer/local/").
     */
    async gitignore(patterns: readonly string[]): Promise<void> {
        return contextGitignoreEnsure(this.projectPath, patterns);
    }

    private progressAcquire(): ReturnType<typeof progressMultilineStart> {
        if (!this.progressMultiline) {
            this.progressMultiline = progressMultilineStart();
        }
        this.progressUsers += 1;
        return this.progressMultiline;
    }

    private progressRelease(): void {
        if (this.progressUsers === 0) {
            return;
        }
        this.progressUsers -= 1;
        if (this.progressUsers > 0) {
            return;
        }
        // Required cleanup: clears spinner interval tied to process stderr rendering.
        this.progressMultiline?.stop();
        this.progressMultiline = undefined;
    }
}

function contextPathResolve(projectPath: string, filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return path.resolve(filePath);
    }
    return path.resolve(projectPath, filePath);
}

function contextSettingsReadonly(settings: Readonly<BeerSettings>): Readonly<BeerSettings> {
    return Object.freeze({
        ...settings,
        sourceRepo: settings.sourceRepo ? Object.freeze({ ...settings.sourceRepo }) : undefined,
        publishRepo: settings.publishRepo ? Object.freeze({ ...settings.publishRepo }) : undefined
    });
}

function contextProgressSuccessMessageResolve(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const message = value.trim();
    return message.length > 0 ? message : undefined;
}

function contextProgressErrorMessageResolve(error: unknown): string | undefined {
    if (error instanceof Error) {
        const message = error.message.trim();
        return message.length > 0 ? message : undefined;
    }
    if (typeof error !== "string") {
        return undefined;
    }
    const message = error.trim();
    return message.length > 0 ? message : undefined;
}
