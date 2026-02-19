import { beforeEach, describe, expect, it, vi } from "vitest";

const wrapWithSandboxMock = vi.hoisted(() => vi.fn());
const sandboxInferenceFilesystemPolicyMock = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sandbox-runtime", () => ({
    SandboxManager: {
        wrapWithSandbox: wrapWithSandboxMock
    }
}));

vi.mock("./sandboxInferenceFilesystemPolicy.js", () => ({
    sandboxInferenceFilesystemPolicy: sandboxInferenceFilesystemPolicyMock
}));

describe("sandboxInferenceGet", () => {
    beforeEach(() => {
        vi.resetModules();
        wrapWithSandboxMock.mockReset();
        sandboxInferenceFilesystemPolicyMock.mockReset();
        sandboxInferenceFilesystemPolicyMock.mockReturnValue({
            denyRead: ["deny-read"],
            allowWrite: ["allow-write"],
            denyWrite: ["deny-write"]
        });
    });

    it("builds read-only filesystem policy by default", async () => {
        wrapWithSandboxMock.mockResolvedValue("wrapped-command");
        const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");

        const sandbox = await sandboxInferenceGet();
        await sandbox.wrapCommand("echo hi");

        expect(sandboxInferenceFilesystemPolicyMock).toHaveBeenCalledWith({
            writePolicy: undefined
        });
        expect(wrapWithSandboxMock).toHaveBeenCalledWith(
            "echo hi",
            undefined,
            {
                filesystem: {
                    denyRead: ["deny-read"],
                    allowWrite: ["allow-write"],
                    denyWrite: ["deny-write"]
                }
            },
            undefined
        );
    });

    it("forwards enableWeakerNetworkIsolation to sandbox runtime options", async () => {
        wrapWithSandboxMock.mockResolvedValue("wrapped-command");
        const { sandboxInferenceGet } = await import("./sandboxInferenceGet.js");
        const writePolicy = {
            mode: "write-whitelist" as const,
            writablePaths: ["README.md"]
        };

        const sandbox = await sandboxInferenceGet({
            writePolicy,
            enableWeakerNetworkIsolation: true
        });
        const wrapped = await sandbox.wrapCommand("echo hi");

        expect(wrapped).toBe("wrapped-command");
        expect(sandboxInferenceFilesystemPolicyMock).toHaveBeenCalledWith({
            writePolicy
        });
        expect(wrapWithSandboxMock).toHaveBeenCalledWith(
            "echo hi",
            undefined,
            {
                filesystem: {
                    denyRead: ["deny-read"],
                    allowWrite: ["allow-write"],
                    denyWrite: ["deny-write"]
                },
                enableWeakerNetworkIsolation: true
            },
            undefined
        );
    });
});
