import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@text": path.resolve(__dirname, "sources/text/text.ts"),
      "@/types": path.resolve(__dirname, "sources/types.ts")
    }
  },
  test: {
    include: ["sources/**/*.spec.ts"]
  }
});
