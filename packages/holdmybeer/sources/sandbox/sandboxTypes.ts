export interface CommandSandbox {
  wrapCommand(command: string, abortSignal?: AbortSignal): Promise<string>;
}
