import { afterAll, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { sandboxInferenceFilesystemPolicy } from "@/modules/sandbox/sandboxInferenceFilesystemPolicy.js";

describe("sandboxInferenceFilesystemPolicy", () => {
  const initCwd = process.env.INIT_CWD;

  beforeEach(() => {
    process.env.INIT_CWD = "/workspace/project";
  });

  afterAll(() => {
    process.env.INIT_CWD = initCwd;
  });

  it("allows provider auth state writes when no policy is provided", () => {
    const result = sandboxInferenceFilesystemPolicy({
      platform: "linux",
      homeDir: "/home/alice"
    });

    expect(result.allowWrite).toEqual([
      path.resolve("/home/alice/.claude"),
      path.resolve("/home/alice/.codex")
    ]);
  });

  it("dedupes and resolves whitelisted write paths with auth dirs", () => {
    const result = sandboxInferenceFilesystemPolicy({
      writePolicy: {
        mode: "write-whitelist",
        writablePaths: [
          "README.md",
          "./README.md",
          "doc/inference-sandbox.md"
        ]
      },
      platform: "linux",
      homeDir: "/home/alice"
    });

    expect(result.allowWrite).toEqual([
      path.resolve("/workspace/project/README.md"),
      path.resolve("/workspace/project/doc/inference-sandbox.md"),
      path.resolve("/home/alice/.claude"),
      path.resolve("/home/alice/.codex")
    ]);
  });

  it("adds linux sensitive deny paths to read and write", () => {
    const result = sandboxInferenceFilesystemPolicy({
      writePolicy: { mode: "read-only" },
      platform: "linux",
      homeDir: "/home/alice"
    });

    expect(result.denyRead).toEqual(
      expect.arrayContaining([
        path.resolve("/home/alice/.ssh"),
        path.resolve("/home/alice/.gnupg"),
        path.resolve("/home/alice/.aws"),
        path.resolve("/etc/ssh"),
        path.resolve("/etc/ssl/private"),
        path.resolve("/root/.ssh")
      ])
    );
    expect(result.denyWrite).toEqual(result.denyRead);
  });

  it("adds macOS sensitive deny paths to read and write", () => {
    const result = sandboxInferenceFilesystemPolicy({
      writePolicy: { mode: "read-only" },
      platform: "darwin",
      homeDir: "/Users/alice"
    });

    expect(result.denyRead).toEqual(
      expect.arrayContaining([
        path.resolve("/Users/alice/.ssh"),
        path.resolve("/Users/alice/Library/Application Support/com.apple.TCC"),
        path.resolve("/private/etc/ssh")
      ])
    );
    expect(result.denyWrite).toEqual(result.denyRead);
  });
});
