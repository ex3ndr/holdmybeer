import { describe, expect, it } from "vitest";
import { ralphPlanResponseParse } from "./ralphPlanResponseParse.js";

describe("ralphPlanResponseParse", () => {
    it("parses plan and numbered questions", () => {
        const result = ralphPlanResponseParse(`
<plan>
# Plan
Do work
</plan>
<questions>
1. Which runtime should we target?
2) Should this support dry run?
</questions>
`);

        expect(result).toEqual({
            plan: "# Plan\nDo work",
            questions: ["Which runtime should we target?", "Should this support dry run?"]
        });
    });

    it("returns no questions when questions tag is omitted", () => {
        const result = ralphPlanResponseParse(`
<plan>
Plan only
</plan>
`);
        expect(result).toEqual({
            plan: "Plan only",
            questions: []
        });
    });

    it("treats questions block with none as empty", () => {
        const result = ralphPlanResponseParse(`
<plan>
Plan only
</plan>
<questions>
none
</questions>
`);
        expect(result.questions).toEqual([]);
    });

    it("throws when plan tag is missing", () => {
        expect(() => ralphPlanResponseParse("<questions>1. Q?</questions>")).toThrow(
            "Planning response is missing <plan>...</plan> tags."
        );
    });
});
