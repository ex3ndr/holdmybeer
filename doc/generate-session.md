# Generate Session Wrapper

`generateSessionCreate` provides a stateful session object over `generate`.

## Flow

```mermaid
flowchart TD
  A[create session object] --> B[optional initial sessionId]
  B --> C[session.generate(prompt)]
  C --> D[generate(..., sessionId)]
  D --> E[provider returns sessionId]
  E --> F[store latest sessionId in object]
  F --> G[next session.generate reuses sessionId]
```

## Notes

- Session state lives in memory (`session.sessionId`) and is updated after each generate call.
- To resume later, persist `session.sessionId` externally and pass it back into `generateSessionCreate`.
- Per-call permissions still work and override wrapper-level defaults.
