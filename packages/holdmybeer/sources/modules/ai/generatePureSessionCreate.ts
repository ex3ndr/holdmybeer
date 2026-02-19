import type { GenerateResult } from "@/modules/ai/generate.js";
import { type GeneratePureTextPermissions, generatePureText } from "@/modules/ai/generatePureText.js";
import type { Context } from "@/types";

export interface PureSession {
    readonly sessionId?: string;
    generate(prompt: string, permissions?: PureSessionGeneratePermissions): Promise<GenerateResult>;
}

export interface PureSessionGeneratePermissions extends Omit<GeneratePureTextPermissions, "sessionId"> {}

export interface PureSessionCreateOptions {
    sessionId?: string;
    permissions?: PureSessionGeneratePermissions;
}

/**
 * Creates a stateful pure-inference session that carries provider sessionId between calls.
 * Expects: caller persists sessionId when they need to resume later.
 */
export function generatePureSessionCreate(context: Context, options: PureSessionCreateOptions = {}): PureSession {
    let sessionId = sessionIdNormalize(options.sessionId);
    const basePermissions = options.permissions;

    return {
        get sessionId() {
            return sessionId;
        },
        async generate(prompt: string, permissions: PureSessionGeneratePermissions = {}): Promise<GenerateResult> {
            const result = await generatePureText(context, prompt, {
                ...basePermissions,
                ...permissions,
                sessionId
            });
            sessionId = sessionIdNormalize(result.sessionId) ?? sessionId;
            return result;
        }
    };
}

function sessionIdNormalize(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
