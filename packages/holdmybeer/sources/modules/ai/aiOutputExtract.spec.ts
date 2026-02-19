import { describe, expect, it } from "vitest";
import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";

describe("aiOutputExtract", () => {
    it("extracts text from output tags", () => {
        const result = aiOutputExtract("before\n<output>Hello</output>\nafter");
        expect(result).toBe("Hello");
    });

    it("extracts text from uppercase output tags", () => {
        const result = aiOutputExtract("before\n<OUTPUT>Hello</OUTPUT>\nafter");
        expect(result).toBe("Hello");
    });

    it("extracts text from mixed-case output tags", () => {
        const result = aiOutputExtract("before\n<OuTpUt>Hello</oUtPuT>\nafter");
        expect(result).toBe("Hello");
    });

    it("returns null when tags are missing", () => {
        const result = aiOutputExtract("Hello");
        expect(result).toBeNull();
    });

    it("returns null when output tags are empty", () => {
        const result = aiOutputExtract("<output>   </output>");
        expect(result).toBeNull();
    });
});
