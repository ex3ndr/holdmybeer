import { describe, expect, it } from "vitest";
import { treeNodeSlug } from "@/modules/tree/treeNodeSlug.js";

describe("treeNodeSlug", () => {
    it("converts spaces to hyphen separators", () => {
        expect(treeNodeSlug("Authentication System")).toBe("authentication-system");
    });

    it("removes special characters and deduplicates separators", () => {
        expect(treeNodeSlug("Auth!!! ## OAuth@@@ Flow")).toBe("auth-oauth-flow");
    });

    it("normalizes unicode accents", () => {
        expect(treeNodeSlug("Crème Brûlée Topics")).toBe("creme-brulee-topics");
    });

    it("returns fallback for empty values", () => {
        expect(treeNodeSlug("   ")).toBe("node");
        expect(treeNodeSlug("***")).toBe("node");
    });

    it("limits output length and removes trailing hyphens after truncation", () => {
        expect(treeNodeSlug(`${"very-long-topic-".repeat(8)}end`)).toHaveLength(60);
        expect(treeNodeSlug(`${"a".repeat(59)} !`)).not.toMatch(/-$/);
    });

    it("trims trailing hyphens", () => {
        expect(treeNodeSlug("Auth Topic ---")).toBe("auth-topic");
    });
});
