import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { text, textFormatKey } from "@text";
import { generateProgressMessageResolve } from "@/_workflows/steps/generateProgressMessageResolve.js";
import { ralphPlanPathResolve } from "@/_workflows/steps/ralphPlanPathResolve.js";
import { ralphPlanResponseParse } from "@/_workflows/steps/ralphPlanResponseParse.js";
import type { GenerateResult } from "@/modules/ai/generate.js";
import { generateSessionCreate, type Session } from "@/modules/ai/generateSessionCreate.js";
import { promptInput } from "@/modules/prompt/promptInput.js";
import type { Context } from "@/types";

export interface RalphPlanOptions {
    planPath?: string;
}

const initialPlanningPromptTemplate = [
    "Create an implementation plan for this build goal: {{buildGoal}}",
    "Respond using this exact structure:",
    "<plan>",
    "(full markdown plan with Overview, Validation Commands, and Implementation Steps with checkbox tasks)",
    "</plan>",
    "<questions>",
    "(numbered clarifying questions, one per line)",
    "</questions>",
    "Rules:",
    "- keep the plan concrete and scoped to this repository",
    "- include tests for all code tasks",
    "- if no clarifications are needed, omit the <questions> block entirely"
].join("\n");

const refinePlanPromptTemplate = [
    "Refine the implementation plan using the latest user input.",
    "Respond using the same structure as before (<plan> and optional <questions>).",
    "If all clarifications are resolved, return only <plan> without <questions>."
].join("\n");

const rejectedPlanPromptTemplate = [
    "The user rejected the current plan.",
    "User feedback:",
    "{{feedback}}",
    "Revise the plan accordingly and respond using <plan> and optional <questions> tags."
].join("\n");

/**
 * Runs an Opus planning loop with clarifying questions until user approval.
 * Expects: buildGoal is non-empty and ctx.projectPath is writable for plan persistence.
 */
export async function ralphPlan(
    ctx: Context,
    buildGoal: string,
    options: RalphPlanOptions = {}
): Promise<{ planPath: string; provider?: string; sessionId?: string; text: string }> {
    const goal = buildGoal.trim();
    if (!goal) {
        throw new Error(text.error_ralph_goal_required!);
    }

    const planPath = options.planPath ?? ralphPlanPathResolve(ctx, goal);
    const session = generateSessionCreate(ctx, {
        permissions: {
            modelSelectionMode: "opus",
            writePolicy: { mode: "read-only" }
        }
    });

    let result = await ralphSessionGenerateWithProgress(
        ctx,
        session,
        initialPlanningPromptTemplate.replace(/\{\{buildGoal\}\}/g, goal),
        text.inference_ralph_planning!
    );
    let parsed = ralphPlanResponseParse(result.text);

    while (true) {
        while (parsed.questions.length > 0) {
            const questionsAndAnswers = await ralphPlanQuestionsAndAnswersPrompt(parsed.questions);
            result = await ralphSessionGenerateWithProgress(
                ctx,
                session,
                `${refinePlanPromptTemplate}\n\n${questionsAndAnswers}`,
                text.inference_ralph_plan_refining!
            );
            parsed = ralphPlanResponseParse(result.text);
        }

        const approved = ralphPlanApprovalParse(
            await promptInput(`${parsed.plan}\n\n${text.ralph_plan_approve_prompt!}`, "y")
        );
        if (approved) {
            break;
        }

        const feedback = await promptInput(text.ralph_plan_feedback_prompt!);
        const feedbackNormalized = feedback.trim() || "Improve the plan based on my rejection and clarify assumptions.";
        result = await ralphSessionGenerateWithProgress(
            ctx,
            session,
            rejectedPlanPromptTemplate.replace(/\{\{feedback\}\}/g, feedbackNormalized),
            text.inference_ralph_plan_refining!
        );
        parsed = ralphPlanResponseParse(result.text);
    }

    const absolutePath = path.resolve(ctx.projectPath, planPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${parsed.plan.trim()}\n`, "utf-8");

    return {
        planPath,
        provider: result.provider,
        sessionId: result.sessionId,
        text: parsed.plan
    };
}

async function ralphSessionGenerateWithProgress(
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

function ralphPlanApprovalParse(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
}

async function ralphPlanQuestionsAndAnswersPrompt(questions: string[]): Promise<string> {
    const pairs: string[] = [];
    for (const question of questions) {
        const answer = await promptInput(textFormatKey("ralph_plan_questions_prompt", { question }));
        pairs.push(`- Q: ${question}\n  A: ${answer || "(no additional details)"}`);
    }
    return ["User answers:", ...pairs].join("\n");
}
