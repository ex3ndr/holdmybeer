import { mkdir } from "node:fs/promises";
import path from "node:path";
import { text } from "@text";
import { generateText } from "@/modules/ai/generateText.js";
import { treeChildrenParse } from "@/modules/tree/treeChildrenParse.js";
import { treeChildrenRead } from "@/modules/tree/treeChildrenRead.js";
import { treeChildrenWrite } from "@/modules/tree/treeChildrenWrite.js";
import { treeInferenceProgressRun } from "@/modules/tree/treeInferenceProgressRun.js";
import { treeLeafPick } from "@/modules/tree/treeLeafPick.js";
import { treeNodeExpand } from "@/modules/tree/treeNodeExpand.js";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import { treeNodeWrite } from "@/modules/tree/treeNodeWrite.js";
import { treeStateLeaves } from "@/modules/tree/treeStateLeaves.js";
import { treeStateRead } from "@/modules/tree/treeStateRead.js";
import type { Context, TreeNode, TreeSearchConfig, TreeSearchResult } from "@/types";

/**
 * Runs persisted two-phase tree search: root walk, then LLM-guided leaf expansion.
 * Expects: config.documentPrompt/childrenPrompt are deterministic and rootDir is writable.
 */
export async function treeSearchRun(ctx: Context, config: TreeSearchConfig): Promise<TreeSearchResult> {
    const concurrency = Math.max(1, config.concurrency ?? 4);
    const maxDepth = Math.max(0, config.maxDepth ?? 4);

    await mkdir(config.rootDir, { recursive: true });

    let totalExpanded = 0;
    let totalSkipped = 0;

    const rootChildren = await treeSearchRunRootChildrenResolve(ctx, config);
    for (const child of rootChildren) {
        await treeSearchRunEnsureNode(path.join(config.rootDir, child.slug), {
            title: child.title,
            slug: child.slug,
            status: "unexpanded"
        });
    }

    const rootNodes = await treeStateRead(config.rootDir);
    await treeSearchRunMapLimit(rootNodes, concurrency, async (node) => {
        if (node.depth >= maxDepth) {
            await treeSearchRunDepthLimitMark(node);
            return;
        }
        const expanded = await treeNodeExpand(ctx, node, config);
        if (expanded.skipped) {
            totalSkipped += 1;
            return;
        }
        totalExpanded += 1;
    });

    await treeSearchRunDispatchGuided(ctx, config, concurrency, maxDepth, {
        onExpanded: () => {
            totalExpanded += 1;
        },
        onSkipped: () => {
            totalSkipped += 1;
        }
    });

    const finalState = await treeStateRead(config.rootDir);
    const totalLeaves = treeSearchRunLeafCount(finalState);
    return {
        totalExpanded,
        totalLeaves,
        totalSkipped
    };
}

async function treeSearchRunRootChildrenResolve(ctx: Context, config: TreeSearchConfig) {
    const cached = await treeChildrenRead(config.rootDir);
    if (cached !== null) {
        return cached;
    }

    const result = await treeInferenceProgressRun(ctx, text.tree_search_root_expanding!, async (onEvent) => {
        return generateText(ctx, config.rootPrompt, {
            modelSelectionMode: config.modelSelectionMode,
            onEvent,
            verify: ({ text }) => {
                treeChildrenParse(text);
            }
        });
    });
    const parsed = treeChildrenParse(result.text);
    await treeChildrenWrite(config.rootDir, parsed);
    return parsed;
}

async function treeSearchRunDispatchGuided(
    ctx: Context,
    config: TreeSearchConfig,
    concurrency: number,
    maxDepth: number,
    callbacks: { onExpanded: () => void; onSkipped: () => void }
): Promise<void> {
    const inFlight = new Set<Promise<void>>();

    while (true) {
        let pickerExhausted = false;
        while (inFlight.size < concurrency) {
            const picked = await treeLeafPick(ctx, config);
            if (!picked) {
                pickerExhausted = true;
                break;
            }

            if (picked.depth >= maxDepth) {
                await treeSearchRunDepthLimitMark(picked);
                continue;
            }

            const current = await treeNodeRead(picked.dirPath);
            if (current?.status === "in-progress") {
                continue;
            }

            await treeNodeWrite(picked.dirPath, {
                title: current?.title ?? picked.title,
                slug: current?.slug ?? picked.slug,
                sessionId: current?.sessionId,
                status: "in-progress"
            });

            const job = (async () => {
                const expanded = await treeNodeExpand(ctx, { ...picked, status: "in-progress" }, config);
                if (expanded.skipped) {
                    callbacks.onSkipped();
                    return;
                }
                callbacks.onExpanded();
            })();

            inFlight.add(job);
            job.finally(() => {
                inFlight.delete(job);
            });
        }

        if (inFlight.size === 0) {
            if (pickerExhausted) {
                if ((await treeSearchRunUnexpandedLeafCount(config.rootDir)) > 0) {
                    await ctx.progress(text.tree_search_picker_unresolved!, async () => undefined);
                }
                return;
            }
        }

        await Promise.race(inFlight);
    }
}

async function treeSearchRunEnsureNode(
    nodeDirPath: string,
    node: { title: string; slug: string; sessionId?: string; status: string }
): Promise<void> {
    const existing = await treeNodeRead(nodeDirPath);
    if (existing) {
        return;
    }

    await treeNodeWrite(nodeDirPath, {
        title: node.title,
        slug: node.slug,
        sessionId: node.sessionId,
        status: node.status
    });
}

async function treeSearchRunDepthLimitMark(node: TreeNode): Promise<void> {
    const current = await treeNodeRead(node.dirPath);
    await treeChildrenWrite(node.dirPath, []);
    await treeNodeWrite(node.dirPath, {
        title: current?.title ?? node.title,
        slug: current?.slug ?? node.slug,
        sessionId: current?.sessionId,
        status: "leaf"
    });
}

async function treeSearchRunMapLimit<T>(
    entries: readonly T[],
    concurrency: number,
    run: (entry: T, index: number) => Promise<void>
): Promise<void> {
    const active = new Set<Promise<void>>();

    for (const [index, entry] of entries.entries()) {
        const task = run(entry, index);
        active.add(task);
        task.finally(() => {
            active.delete(task);
        });

        if (active.size >= concurrency) {
            await Promise.race(active);
        }
    }

    await Promise.all(active);
}

function treeSearchRunLeafCount(nodes: readonly TreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
        if (node.status === "leaf") {
            count += 1;
        }
        count += treeSearchRunLeafCount(node.children);
    }
    return count;
}

async function treeSearchRunUnexpandedLeafCount(rootDir: string): Promise<number> {
    const state = await treeStateRead(rootDir);
    return treeStateLeaves(state).length;
}
