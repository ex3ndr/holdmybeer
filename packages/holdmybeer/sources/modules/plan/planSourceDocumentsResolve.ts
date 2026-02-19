import { stat } from "node:fs/promises";
import path from "node:path";
import type { PlanSourceDocument } from "@/modules/plan/planSourceDocumentTypes.js";

interface PlanSourceCandidate {
    label: string;
    relativePath: string;
}

const planSourceCandidates: readonly PlanSourceCandidate[] = [
    { label: "Project Blueprint", relativePath: "doc/project-blueprint.md" },
    { label: "Product Description", relativePath: "doc/product-pitch-final.md" },
    { label: "Product Description Draft", relativePath: "doc/product-pitch.md" },
    { label: "Technology Stack", relativePath: "doc/technology-stack-final.md" },
    { label: "Technology Stack Draft", relativePath: "doc/technology-stack.md" },
    { label: "Decisions", relativePath: "doc/decisions.md" },
    { label: "Research", relativePath: "doc/research.md" },
    { label: "Repository README", relativePath: "README.md" }
];

/**
 * Resolves available planning source documents from standard repository paths.
 * Expects: projectPath is repository root and candidate files are regular markdown documents.
 */
export async function planSourceDocumentsResolve(projectPath: string): Promise<PlanSourceDocument[]> {
    const resolved: PlanSourceDocument[] = [];

    for (const candidate of planSourceCandidates) {
        const absolutePath = path.resolve(projectPath, candidate.relativePath);
        if (!(await planSourceDocumentExists(absolutePath))) {
            continue;
        }
        resolved.push({
            label: candidate.label,
            relativePath: candidate.relativePath,
            absolutePath
        });
    }

    return resolved;
}

async function planSourceDocumentExists(filePath: string): Promise<boolean> {
    try {
        const fileStat = await stat(filePath);
        return fileStat.isFile();
    } catch {
        return false;
    }
}
