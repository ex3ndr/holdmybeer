import type { Context } from "@/types";

/**
 * Resolves a deterministic plan file path for ralph-loop.
 * Expects: buildGoal is user-entered free text describing what to build.
 */
export function ralphLoopPlanPathResolve(_ctx: Context, buildGoal: string, nowMs: number = Date.now()): string {
    const date = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, "");
    const slug = ralphLoopSlugResolve(buildGoal);
    return `doc/plans/${date}-${slug}.md`;
}

function ralphLoopSlugResolve(input: string): string {
    const base = input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!base) {
        return "task";
    }
    return base.slice(0, 48).replace(/-+$/g, "") || "task";
}
