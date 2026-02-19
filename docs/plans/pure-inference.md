# Pure Inference Mode (No Tools)

## Overview
- Add a `generatePureText` function for tool-free inference through `pi --no-tools --no-extensions --no-skills`
- Skips sandbox wrapping entirely (no tools = no FS risk)
- Sends raw prompt without sandbox instructions or `<output>` tag requirements
- Also supports sessions via `generatePureSessionCreate`

## Context (from discovery)
- Inference pipeline: `generate()` -> `providerGenerate()` -> `piProviderGenerate()` -> `pi` CLI
- `pi` CLI supports `--no-tools`, `--no-extensions`, `--no-skills` flags to strip down to bare inference
- Current flow always wraps with sandbox, prepends sandbox/output instructions, extracts `<output>` tags
- `CommandSandbox` interface requires `wrapCommand` — need a passthrough for pure mode
- `commandJSONL` always calls `sandbox.wrapCommand` — passthrough sandbox avoids changing it

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility

## Testing Strategy
- **Unit tests**: required for every task (see Development Approach above)

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## Implementation Steps

### Task 1: Add `pure` flag to pi provider layer
- [x] Add `pure?: boolean` to `PiProviderGenerateInput` in `sources/modules/ai/providers/piProviderGenerate.ts`
- [x] Update `piProviderArgsResolve` to prepend `--no-tools --no-extensions --no-skills` when `pure` is true
- [x] Write tests for `piProviderArgsResolve` with `pure: true` (verify all three flags appear)
- [x] Write tests for `piProviderArgsResolve` with `pure: false` / undefined (verify no flags)
- [x] Run tests — must pass before next task

### Task 2: Add `pure` flag to provider generate layer
- [x] Add `pure?: boolean` to `ProviderGenerateInput` in `sources/modules/ai/providerGenerate.ts`
- [x] Pass `pure` through to `piProviderGenerate` call
- [x] Run tests — must pass before next task

### Task 3: Create passthrough sandbox
- [x] Create `sources/modules/sandbox/sandboxPassthrough.ts` with `sandboxPassthrough()` that returns a `CommandSandbox` where `wrapCommand` returns the command unchanged
- [x] Write test for `sandboxPassthrough` — verify command passes through unmodified
- [x] Run tests — must pass before next task

### Task 4: Create `generatePureText`
- [x] Create `sources/modules/ai/generatePureText.ts`
- [x] Define `GeneratePureTextPermissions` — subset of `GeneratePermissions`: `sessionId`, `providerPriority`, `modelPriority`, `modelSelectionMode`, `showProgress`, `onEvent`
- [x] Implement `generatePureText(context, prompt, permissions?)` that:
  - Uses `sandboxPassthrough()` (no sandbox wrapping)
  - Sends prompt directly (no sandbox prompt, no expected output prompt)
  - Passes `pure: true` and `requireOutputTags: false` to `providerGenerate`
  - Returns `GenerateResult` (`{ provider?, sessionId?, text }`)
- [x] Write tests for `generatePureText` — mock `providerGenerate`, verify no sandbox/output-tag machinery, verify `pure: true` is passed
- [x] Run tests — must pass before next task

### Task 5: Create `generatePureSessionCreate`
- [x] Create `sources/modules/ai/generatePureSessionCreate.ts`
- [x] Define `PureSession` interface with `sessionId` getter and `generate(prompt, permissions?)` method
- [x] Define `PureSessionCreateOptions` with optional `sessionId` and `permissions`
- [x] Implement `generatePureSessionCreate(context, options?)` — mirrors `generateSessionCreate` but calls `generatePureText` internally
- [x] Write tests for `generatePureSessionCreate` — verify session ID tracking across calls, verify `generatePureText` is used
- [x] Run tests — must pass before next task

### Task 6: Verify acceptance criteria
- [x] Verify `generatePureText` works standalone (no tools, no sandbox, raw text output)
- [x] Verify `generatePureSessionCreate` carries session ID across calls
- [x] Run full test suite (unit tests)
- [x] Run linter — all issues must be fixed

### Task 7: [Final] Update documentation
- [x] Add brief doc entry in `doc/` if new patterns discovered

## Technical Details

### Data flow for pure inference
```
generatePureText(context, prompt)
  -> providerGenerate({
       pure: true,
       requireOutputTags: false,
       sandbox: sandboxPassthrough(),
       prompt: prompt  // raw, no prepended instructions
     })
    -> piProviderGenerate({ pure: true, ... })
      -> pi --mode json --print --no-tools --no-extensions --no-skills [--session X] [--model Y] "prompt"
```

### New files
- `sources/modules/ai/generatePureText.ts` — standalone pure text generation
- `sources/modules/ai/generatePureSessionCreate.ts` — session wrapper for pure text
- `sources/modules/sandbox/sandboxPassthrough.ts` — passthrough sandbox (no wrapping)

### Modified files
- `sources/modules/ai/providers/piProviderGenerate.ts` — add `pure` to input and args
- `sources/modules/ai/providerGenerate.ts` — add `pure` to input, pass through

### `GeneratePureTextPermissions` type
```typescript
interface GeneratePureTextPermissions {
    sessionId?: string;
    providerPriority?: readonly ProviderId[];
    modelPriority?: readonly string[];
    modelSelectionMode?: ProviderModelSelectionMode;
    showProgress?: boolean;
    onEvent?: (event: GenerateEvent) => void;
}
```
No `writePolicy`, no `expectedOutput`, no `enableWeakerNetworkIsolation` — these are tool-related concerns.

## Post-Completion

**Manual verification:**
- Test with actual `pi --no-tools` invocation to confirm tool-free response
