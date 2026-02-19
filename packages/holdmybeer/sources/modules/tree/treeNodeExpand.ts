import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { textFormatKey } from "@text";
import matter from "gray-matter";
import type { ZodTypeAny } from "zod";
import { generateSessionCreate } from "@/modules/ai/generateSessionCreate.js";
import { treeChildrenParse } from "@/modules/tree/treeChildrenParse.js";
import { treeChildrenRead } from "@/modules/tree/treeChildrenRead.js";
import { treeChildrenWrite } from "@/modules/tree/treeChildrenWrite.js";
import { treeInferenceProgressRun } from "@/modules/tree/treeInferenceProgressRun.js";
import { treeNodeRead } from "@/modules/tree/treeNodeRead.js";
import { treeNodeWrite } from "@/modules/tree/treeNodeWrite.js";
import type { Context, TreeChildEntry, TreeNode, TreeSearchConfig } from "@/types";

export interface TreeNodeExpandResult {
    children: TreeChildEntry[];
    status: "expanded" | "leaf";
    skipped: boolean;
}

/**
 * Expands a single node by generating its document and children list in one session.
 * Expects: node points to an on-disk tree directory with writable permissions.
 */
export async function treeNodeExpand(
    ctx: Context,
    node: TreeNode,
    config: TreeSearchConfig
): Promise<TreeNodeExpandResult> {
    await mkdir(node.dirPath, { recursive: true });

    const existingNode = await treeNodeRead(node.dirPath);
    const existingChildren = await treeChildrenRead(node.dirPath);
    const nodeStatus = treeNodeExpandStatusResolve(existingNode?.status ?? node.status);
    const documentPath = path.join(node.dirPath, "document.md");

    if (
        (nodeStatus === "expanded" || nodeStatus === "leaf") &&
        existingChildren !== null &&
        (await treeNodeExpandFileExists(documentPath))
    ) {
        return {
            children: existingChildren,
            status: existingChildren.length > 0 ? "expanded" : "leaf",
            skipped: true
        };
    }

    const parentSessionId = await treeNodeExpandParentSessionResolve(node.parentDirPath, config.rootDir);
    const session = generateSessionCreate(ctx, {
        sessionId: parentSessionId
    });

    const documentPrompt = config.documentPrompt(node);
    await treeInferenceProgressRun(
        ctx,
        textFormatKey("tree_search_document_generating", { title: node.title }),
        async (onEvent) =>
            session.generate(documentPrompt, {
                modelSelectionMode: config.modelSelectionMode,
                onEvent,
                expectedOutput: config.frontmatterSchema
                    ? {
                          type: "file",
                          filePath: documentPath,
                          verify: ({ filePath, fileContent }) => {
                              treeNodeExpandFrontmatterVerify(
                                  documentPath,
                                  filePath,
                                  fileContent,
                                  config.frontmatterSchema!
                              );
                          }
                      }
                    : {
                          type: "file",
                          filePath: documentPath
                      },
                writePolicy: {
                    mode: "write-whitelist",
                    writablePaths: [documentPath]
                }
            })
    );

    const childrenResult = await treeInferenceProgressRun(
        ctx,
        textFormatKey("tree_search_children_generating", { title: node.title }),
        async (onEvent) =>
            session.generate(config.childrenPrompt(node), {
                modelSelectionMode: config.modelSelectionMode,
                onEvent,
                expectedOutput: {
                    type: "text",
                    verify: ({ text: outputText }) => {
                        treeChildrenParse(outputText);
                    }
                }
            })
    );

    const children = treeChildrenParse(childrenResult.text);
    await treeChildrenWrite(node.dirPath, children);

    const status: "expanded" | "leaf" = children.length > 0 ? "expanded" : "leaf";
    await treeNodeWrite(node.dirPath, {
        title: node.title,
        slug: node.slug,
        sessionId: session.sessionId,
        status
    });

    for (const child of children) {
        const childDirPath = path.join(node.dirPath, child.slug);
        const childNode = await treeNodeRead(childDirPath);
        if (childNode) {
            continue;
        }
        await treeNodeWrite(childDirPath, {
            title: child.title,
            slug: child.slug,
            status: "unexpanded"
        });
    }

    return {
        children,
        status,
        skipped: false
    };
}

function treeNodeExpandStatusResolve(status: string): TreeNode["status"] {
    if (status === "unexpanded" || status === "in-progress" || status === "expanded" || status === "leaf") {
        return status;
    }
    return "unexpanded";
}

async function treeNodeExpandParentSessionResolve(parentDirPath: string, rootDir: string): Promise<string | undefined> {
    if (path.resolve(parentDirPath) === path.resolve(rootDir)) {
        return undefined;
    }

    const parentNode = await treeNodeRead(parentDirPath);
    return parentNode?.sessionId;
}

async function treeNodeExpandFileExists(filePath: string): Promise<boolean> {
    try {
        const fileStat = await stat(filePath);
        return fileStat.isFile();
    } catch {
        return false;
    }
}

function treeNodeExpandFrontmatterVerify(
    expectedFilePath: string,
    filePath: string,
    fileContent: string,
    schema: ZodTypeAny
): void {
    if (path.resolve(filePath) !== path.resolve(expectedFilePath)) {
        throw new Error(`File must be generated at path: ${expectedFilePath}`);
    }

    if (!matter.test(fileContent)) {
        throw new Error(`Generated file must include frontmatter: ${expectedFilePath}`);
    }

    const parsed = matter(fileContent);
    const parsedFrontmatter = schema.safeParse(parsed.data);
    if (!parsedFrontmatter.success) {
        throw new Error(`Generated frontmatter does not match schema: ${parsedFrontmatter.error.message}`);
    }
}
