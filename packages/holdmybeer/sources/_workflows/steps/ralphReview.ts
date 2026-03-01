import { readFile } from "node:fs/promises";
import path from "node:path";
import { text } from "@text";
import { generateProgressMessageResolve } from "@/_workflows/steps/generateProgressMessageResolve.js";
import { ralphReviewNoIssuesDetect } from "@/_workflows/steps/ralphReviewNoIssuesDetect.js";
import type { GenerateResult } from "@/modules/ai/generate.js";
import { generateSessionCreate, type Session } from "@/modules/ai/generateSessionCreate.js";
import type { Context } from "@/types";

const MAX_REVIEW_ROUNDS = 10;

const reviewInitialPromptTemplate = [
    "Review the implemented changes against this plan:",
    "{{planContent}}",
    "Review checklist:",
    "- identify bugs, regressions, and missing tests",
    "- apply required fixes directly in repository files",
    "- run relevant tests and typecheck",
    "- include a short summary of fixes",
    "- if no issues remain, include <no-issues/> in your response"
].join("\n\n");

const reviewFollowUpPromptTemplate = [
    "Run another review pass on your latest changes.",
    "If any issues remain, fix them now and summarize.",
    "If no issues remain, include <no-issues/> in your response."
].join("\n\n");

/**
 * Runs codex-high review rounds until no issues remain or the safety cap is reached.
 * Expects: planPath points to an existing plan markdown file.
 */
export async function ralphReview(
    ctx: Context,
    planPath: string
): Promise<{ rounds: number; provider?: string; sessionId?: string; text: string }> {
    const projectPath = ctx.projectPath;
    const planContent = await readFile(path.resolve(projectPath, planPath), "utf-8");
    const session = generateSessionCreate(ctx, {
        permissions: {
            modelSelectionMode: "codex-high",
            writePolicy: {
                mode: "write-whitelist",
                writablePaths: [projectPath]
            }
        }
    });

    const roundsSummary: string[] = [];
    let rounds = 0;
    let provider: string | undefined;
    let sessionId: string | undefined;

    for (let round = 1; round <= MAX_REVIEW_ROUNDS; round += 1) {
        const prompt =
            round === 1
                ? reviewInitialPromptTemplate.replace(/\{\{planContent\}\}/g, planContent)
                : reviewFollowUpPromptTemplate;
        const result = await ralphReviewSessionGenerateWithProgress(
            ctx,
            session,
            prompt,
            text.inference_ralph_reviewing!
        );
        rounds = round;
        provider = result.provider ?? provider;
        sessionId = result.sessionId ?? sessionId;
        const roundText = result.text.trim();
        roundsSummary.push(`## Round ${round}\n\n${roundText}`);
        if (ralphReviewNoIssuesDetect(roundText)) {
            break;
        }
    }

    return {
        rounds,
        provider,
        sessionId,
        text: roundsSummary.join("\n\n").trim()
    };
}

async function ralphReviewSessionGenerateWithProgress(
    ctx: Context,
    session: Session,
    prompt: string,
    progressMessage: string
): Promise<GenerateResult> {
    let tokenCount = 0;
    return ctx.progress(`${progressMessage} (starting, tokens 0)`, async (report) =>
        session.generate(prompt, {
            showProgress: false,
            onEvent: (event) => {
                const updated = generateProgressMessageResolve(progressMessage, event, tokenCount);
                tokenCount = updated.tokenCount;
                report(updated.message);
            }
        })
    );
}
