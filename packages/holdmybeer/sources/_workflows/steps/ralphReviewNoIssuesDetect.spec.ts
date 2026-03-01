import { describe, expect, it } from "vitest";
import { ralphReviewNoIssuesDetect } from "./ralphReviewNoIssuesDetect.js";

describe("ralphReviewNoIssuesDetect", () => {
    it("returns true when no-issues tag is present", () => {
        expect(ralphReviewNoIssuesDetect("Done.\n<no-issues/>")).toBe(true);
    });

    it("returns true with case-insensitive and spaced tag", () => {
        expect(ralphReviewNoIssuesDetect("Summary\n<NO-ISSUES   />")).toBe(true);
    });

    it("returns false when no-issues tag is missing", () => {
        expect(ralphReviewNoIssuesDetect("Found and fixed two issues.")).toBe(false);
    });
});
