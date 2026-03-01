export interface RalphPlanResponse {
    plan: string;
    questions: string[];
}

/**
 * Parses planning output with <plan> and optional <questions> tags.
 * Expects: text is model output and must include a non-empty <plan> section.
 */
export function ralphPlanResponseParse(text: string): RalphPlanResponse {
    const planMatch = text.match(/<plan>([\s\S]*?)<\/plan>/i);
    if (!planMatch) {
        throw new Error("Planning response is missing <plan>...</plan> tags.");
    }
    const plan = planMatch[1]?.trim();
    if (!plan) {
        throw new Error("Planning response contains an empty <plan> section.");
    }

    const questionsMatch = text.match(/<questions>([\s\S]*?)<\/questions>/i);
    if (!questionsMatch) {
        return { plan, questions: [] };
    }

    return {
        plan,
        questions: ralphPlanQuestionsParse(questionsMatch[1] ?? "")
    };
}

function ralphPlanQuestionsParse(rawQuestions: string): string[] {
    const lines = rawQuestions
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 1 && /^none\.?$/i.test(lines[0]!)) {
        return [];
    }

    return lines
        .map((line) => line.replace(/^(?:\d+[).\]:-]?\s*|[-*+]\s+)/, "").trim())
        .filter((line) => line.length > 0);
}
