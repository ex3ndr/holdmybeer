import type { Context } from "@/types";

/**
 * Resolves a deterministic plan file path for ralph.
 * Expects: buildGoal is free-form user text describing what to build.
 */
export function ralphPlanPathResolve(_ctx: Context, buildGoal: string, nowMs: number = Date.now()): string {
    const date = new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, "");
    const slug = ralphPlanSlugResolve(buildGoal);
    return `doc/plans/${date}-${slug}.md`;
}

function ralphPlanSlugResolve(input: string): string {
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
