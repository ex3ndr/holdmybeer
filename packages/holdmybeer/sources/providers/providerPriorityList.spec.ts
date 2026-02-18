import { describe, expect, it } from "vitest";
import { providerPriorityList } from "./providerPriorityList.js";

describe("providerPriorityList", () => {
  it("orders available providers by requested provider ids", () => {
    const providers = [
      { id: "claude", available: true, command: "claude", priority: 1 },
      { id: "codex", available: true, command: "codex", priority: 2 }
    ] as const;

    const ordered = providerPriorityList(providers, ["codex", "claude"]);

    expect(ordered.map((provider) => provider.id)).toEqual(["codex", "claude"]);
  });

  it("skips unavailable or missing providers", () => {
    const providers = [
      { id: "claude", available: false, command: "claude", priority: 1 },
      { id: "codex", available: true, command: "codex", priority: 2 }
    ] as const;

    const ordered = providerPriorityList(providers, ["claude", "codex"]);

    expect(ordered.map((provider) => provider.id)).toEqual(["codex"]);
  });
});
