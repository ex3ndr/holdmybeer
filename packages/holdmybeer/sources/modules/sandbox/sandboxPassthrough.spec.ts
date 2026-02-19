import { describe, expect, it } from "vitest";
import { sandboxPassthrough } from "@/modules/sandbox/sandboxPassthrough.js";

describe("sandboxPassthrough", () => {
    it("returns command unchanged", async () => {
        const sandbox = sandboxPassthrough();
        await expect(sandbox.wrapCommand("pi --mode json --print prompt")).resolves.toBe(
            "pi --mode json --print prompt"
        );
    });
});
