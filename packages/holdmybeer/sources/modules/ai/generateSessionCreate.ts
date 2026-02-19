import { type GeneratePermissions, type GenerateResult, generate } from "@/modules/ai/generate.js";
import type { Context } from "@/types";

export interface Session {
    readonly sessionId?: string;
    generate(prompt: string, permissions?: SessionGeneratePermissions): Promise<GenerateResult>;
}

export interface SessionGeneratePermissions extends Omit<GeneratePermissions, "sessionId"> {}

export interface SessionCreateOptions {
    sessionId?: string;
    permissions?: SessionGeneratePermissions;
}

/**
 * Creates a stateful generate session that carries provider sessionId between calls.
 * Expects: callers persist sessionId externally when they want to resume later.
 */
export function generateSessionCreate(context: Context, options: SessionCreateOptions = {}): Session {
    let sessionId = sessionIdNormalize(options.sessionId);
    const basePermissions = options.permissions;

    return {
        get sessionId() {
            return sessionId;
        },
        async generate(prompt: string, permissions: SessionGeneratePermissions = {}): Promise<GenerateResult> {
            const result = await generate(context, prompt, {
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
