import { describe, expect, it } from "vitest";
import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";

describe("providerPriorityList", () => {
    it("orders available providers by requested provider ids", () => {
        const providers = [{ id: "pi", available: true, command: "pi", priority: 1 }] as const;

        const ordered = providerPriorityList(providers, ["pi"]);

        expect(ordered.map((provider) => provider.id)).toEqual(["pi"]);
    });

    it("skips unavailable or missing providers", () => {
        const providers = [{ id: "pi", available: false, command: "pi", priority: 1 }] as const;

        const ordered = providerPriorityList(providers, ["pi"]);

        expect(ordered.map((provider) => provider.id)).toEqual([]);
    });
});
