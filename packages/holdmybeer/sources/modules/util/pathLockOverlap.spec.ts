import { describe, expect, it } from "vitest";
import { pathLockConflicts, pathLockOverlap } from "@/modules/util/pathLockOverlap.js";

describe("pathLockOverlap", () => {
    it("matches exact paths", () => {
        expect(pathLockOverlap("src/app.ts", "src/app.ts")).toBe(true);
    });

    it("treats parent directories as conflicting", () => {
        expect(pathLockOverlap("src/bar", "src/bar/baz.ts")).toBe(true);
    });

    it("treats child paths as conflicting with locked parent", () => {
        expect(pathLockOverlap("src/bar/baz.ts", "src/bar")).toBe(true);
    });

    it("does not match sibling paths", () => {
        expect(pathLockOverlap("src/bar", "src/baz")).toBe(false);
    });

    it("normalizes trailing slashes and dot segments", () => {
        expect(pathLockOverlap("src/bar/", "./src/bar/baz.ts")).toBe(true);
    });
});

describe("pathLockConflicts", () => {
    it("returns only conflicting locked paths", () => {
        const conflicts = pathLockConflicts(["src/app.ts"], ["src", "docs/guide.md"]);
        expect(conflicts).toEqual(["src"]);
    });

    it("returns empty list when no conflicts exist", () => {
        const conflicts = pathLockConflicts(["src/app.ts"], ["docs", "fixtures"]);
        expect(conflicts).toEqual([]);
    });

    it("deduplicates repeated conflicts", () => {
        const conflicts = pathLockConflicts(["src/a.ts", "src/b.ts"], ["src/", "src"]);
        expect(conflicts).toEqual(["src"]);
    });
});
