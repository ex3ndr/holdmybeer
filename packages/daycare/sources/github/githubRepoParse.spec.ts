import { describe, expect, it } from "vitest";
import { githubRepoParse } from "./githubRepoParse.js";

describe("githubRepoParse", () => {
  it("parses owner/repo shorthand", () => {
    expect(githubRepoParse("ex3ndr/daycare")?.fullName).toBe("ex3ndr/daycare");
  });

  it("parses https url", () => {
    expect(githubRepoParse("https://github.com/ex3ndr/daycare")?.fullName).toBe(
      "ex3ndr/daycare"
    );
  });

  it("parses ssh git url", () => {
    expect(githubRepoParse("git@github.com:ex3ndr/daycare.git")?.fullName).toBe(
      "ex3ndr/daycare"
    );
  });

  it("rejects invalid input", () => {
    expect(githubRepoParse("not-a-repo")).toBeNull();
  });
});
