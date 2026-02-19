import { text } from "@text";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextProgresses } from "@/_workflows/context/context.js";
import type { Context } from "@/types";

const generateDocumentMock = vi.hoisted(() => vi.fn());

vi.mock("@/_workflows/steps/generateDocument.js", () => ({
    generateDocument: generateDocumentMock
}));

import { researchWorkflow } from "@/_workflows/researchWorkflow.js";

describe("researchWorkflow", () => {
    beforeEach(() => {
        generateDocumentMock.mockReset();
    });

    it("runs both research documents via multiline progress", async () => {
        const reports: string[] = [];
        const runMock: ContextProgresses["run"] = vi.fn(async (_message, operation) =>
            operation((message: string) => {
                reports.push(message);
            })
        );
        const progressesMock = vi.fn<Context["progresses"]>(async (operation) => {
            const progresses: ContextProgresses = {
                add: vi.fn(),
                run: runMock
            };
            return operation(progresses);
        });
        const context = { progresses: progressesMock } as unknown as Context;
        generateDocumentMock.mockResolvedValue({ provider: "pi", text: "ok" });

        await researchWorkflow(context);

        expect(progressesMock).toHaveBeenCalledTimes(1);
        expect(runMock).toHaveBeenCalledWith(text.inference_research_summary_opus_generating, expect.any(Function));
        expect(runMock).toHaveBeenCalledWith(text.inference_research_problems_codex_generating, expect.any(Function));
        expect(generateDocumentMock).toHaveBeenCalledTimes(2);
        expect(generateDocumentMock).toHaveBeenCalledWith(
            context,
            {
                promptId: "PROMPT_RESEARCH",
                outputPath: "doc/research.md",
                modelSelectionMode: "opus"
            },
            expect.objectContaining({
                onEvent: expect.any(Function)
            })
        );
        expect(generateDocumentMock).toHaveBeenCalledWith(
            context,
            {
                promptId: "PROMPT_RESEARCH_PROBLEMS",
                outputPath: "doc/research-problems.md",
                modelSelectionMode: "codex-xhigh"
            },
            expect.objectContaining({
                onEvent: expect.any(Function)
            })
        );

        const firstOptions = generateDocumentMock.mock.calls[0]?.[2];
        const secondOptions = generateDocumentMock.mock.calls[1]?.[2];
        firstOptions?.onEvent?.({
            type: "thinking",
            providerId: "pi",
            status: "updated",
            text: "analysis"
        });
        secondOptions?.onEvent?.({
            type: "tool_call",
            providerId: "pi",
            status: "started",
            toolName: "Read"
        });

        expect(reports).toContain(`${text.inference_research_summary_opus_generating} (thinking)`);
        expect(reports).toContain(`${text.inference_research_problems_codex_generating} (reading files)`);
    });
});
