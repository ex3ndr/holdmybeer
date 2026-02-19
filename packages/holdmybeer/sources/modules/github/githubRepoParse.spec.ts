import { describe, expect, it } from "vitest";
import { githubRepoParse } from "@/modules/github/githubRepoParse.js";

describe("githubRepoParse", () => {
    it("parses owner/repo shorthand", () => {
        expect(githubRepoParse("ex3ndr/holdmybeer")?.fullName).toBe("ex3ndr/holdmybeer");
    });

    it("parses https url", () => {
        expect(githubRepoParse("https://github.com/ex3ndr/holdmybeer")?.fullName).toBe("ex3ndr/holdmybeer");
    });

    it("parses ssh git url", () => {
        expect(githubRepoParse("git@github.com:ex3ndr/holdmybeer.git")?.fullName).toBe("ex3ndr/holdmybeer");
    });

    it("rejects invalid input", () => {
        expect(githubRepoParse("not-a-repo")).toBeNull();
    });
});
