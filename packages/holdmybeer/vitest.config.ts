import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, "sources")}/`
      },
      {
        find: "@text",
        replacement: path.resolve(__dirname, "sources/text/text.ts")
      }
    ]
  },
  test: {
    include: ["sources/**/*.spec.ts"]
  }
});
