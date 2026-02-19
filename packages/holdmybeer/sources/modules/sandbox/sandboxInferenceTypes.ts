export type InferenceWritePolicy =
    | { mode: "read-only" }
    | { mode: "write-whitelist"; writablePaths: readonly string[] };
