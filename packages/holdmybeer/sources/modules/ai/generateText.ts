import {
    type GenerateExpectedTextOutputVerify,
    type GeneratePermissions,
    type GenerateResult,
    generate
} from "@/modules/ai/generate.js";
import type { Context } from "@/types";

export interface GenerateTextPermissions extends Omit<GeneratePermissions, "expectedOutput"> {
    verify?: GenerateExpectedTextOutputVerify;
}

/**
 * Shortcut for text generation with default text expectation.
 * Expects: prompt is inference task text and permissions optionally constrain provider/write policy.
 */
export async function generateText(
    context: Context,
    prompt: string,
    permissions: GenerateTextPermissions = {}
): Promise<GenerateResult> {
    const { verify, ...permissionsBase } = permissions;
    const expectedOutput = verify ? { type: "text" as const, verify } : { type: "text" as const };
    return generate(context, prompt, {
        ...permissionsBase,
        expectedOutput
    });
}
