import { text, textFormatKey } from "@text";
import { generateCommit } from "@/_workflows/steps/generateCommit.js";
import { generateReadme } from "@/_workflows/steps/generateReadme.js";
import { beerOriginalPathResolve } from "@/modules/beer/beerOriginalPathResolve.js";
import { gitRemoteEnsure } from "@/modules/git/gitRemoteEnsure.js";
import { gitRepoCheckout } from "@/modules/git/gitRepoCheckout.js";
import { gitRepoEnsure } from "@/modules/git/gitRepoEnsure.js";
import { githubOwnerChoicesGet } from "@/modules/github/githubOwnerChoicesGet.js";
import { githubRepoCreate } from "@/modules/github/githubRepoCreate.js";
import { githubRepoNameResolve } from "@/modules/github/githubRepoNameResolve.js";
import { githubRepoStatusGet } from "@/modules/github/githubRepoStatusGet.js";
import { githubRepoUrlBuild } from "@/modules/github/githubRepoUrlBuild.js";
import { githubViewerGet } from "@/modules/github/githubViewerGet.js";
import { promptConfirm } from "@/modules/prompt/promptConfirm.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { Context } from "@/types";

/**
 * Runs the interactive bootstrap workflow for holdmybeer.
 */
export async function bootstrap(ctx: Context): Promise<void> {

    //
    // Ask for source repository
    //

    if (!ctx.settings.sourceRepo) {
        const sourceRepo = await ctx.askGithubRepo(text.prompt_source_repo!);
        await ctx.applyConfig((next) => {
            next.sourceRepo = sourceRepo;
        });
    }
    const source = ctx.settings.sourceRepo;
    if (!source) {
        throw new Error(text.error_bootstrap_source_required!);
    }

    //
    // Ask for publish repository
    //

    if (!ctx.settings.publishRepo) {
        const viewerLogin = await ctx.progress(text.bootstrap_publish_owners_loading!, async () => githubViewerGet());
        await ctx.progress(text.bootstrap_publish_owners_loading!, async () => githubOwnerChoicesGet(viewerLogin));

        const publishOwner = await promptInput(text.prompt_publish_owner!, viewerLogin);
        const defaultRepoName = `${source.repo}-holdmybeer`;
        const requestedRepoName = await promptInput(text.prompt_publish_repo_name!, defaultRepoName);

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
                throw new Error(text.error_bootstrap_cancelled!);
            }

            const isPrivate = await promptConfirm(text.prompt_create_private!, true);
            await githubRepoCreate(resolvedPublish.fullName, isPrivate ? "private" : "public");
        }

        await ctx.applyConfig((next) => {
            next.publishRepo = {
                owner: publishOwner,
                repo: resolvedPublish.repo,
                fullName: resolvedPublish.fullName,
                url: `https://github.com/${resolvedPublish.fullName}`
            };
        });
    }
    const publishRepo = ctx.settings.publishRepo;
    if (!publishRepo) {
        throw new Error(text.error_bootstrap_publish_required!);
    }

    //
    // Checkout source repository
    //

    const originalCheckoutPath = beerOriginalPathResolve(ctx.projectPath);
    const sourceRemoteUrl = githubRepoUrlBuild(source.fullName);
    const sourceCommitHash = await ctx.progress(text.bootstrap_original_checkout_start!, async () =>
        gitRepoCheckout(sourceRemoteUrl, originalCheckoutPath)
    );
    await ctx.applyConfig((next) => {
        next.sourceCommitHash = sourceCommitHash;
    });

    //
    // Generate README
    //

    if (!await ctx.existFile("README.md")) {
        const readme = await generateReadme(
            ctx,
            {
                sourceFullName: source.fullName,
                publishFullName: publishRepo.fullName,
                originalCheckoutPath
            },
            {
                showProgress: true
            }
        );
        await ctx.writeFile("README.md", readme);
    }

    //
    // Ensure .gitignore includes .beer/local/
    //

    await ctx.gitignore([
        ".beer/local/"
    ]);

    //
    // Generate commit message
    //

    const commitMessageGenerated = await generateCommit(ctx, { hint: `bootstrap project for source repository ${source.fullName}`, showProgress: true });

    //
    // Init git repository
    //

    await gitRepoEnsure(ctx.projectPath);
    const publishRemoteUrl = githubRepoUrlBuild(publishRepo.fullName);
    await gitRemoteEnsure(publishRemoteUrl, ctx.projectPath);

    //
    // Commit and push to publish repository
    //

    await ctx.progress(textFormatKey("bootstrap_push_start", { remote: "origin", branch: "main" }), async () => {
        return ctx.checkpoint(commitMessageGenerated.text, { remote: "origin", branch: "main" });
    });
}