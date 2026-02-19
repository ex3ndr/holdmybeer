# Log File Output

Application logs now write to `.beer/local/logs/beer-YYYY-MM-DD.log` instead of stdout.

## Flow

```mermaid
flowchart LR
  A[beer command] --> B[beerLog or beerLogLine]
  B --> C[resolve project path]
  C --> D[ensure .beer/local/logs directory]
  D --> E[append timestamped line to beer-YYYY-MM-DD.log]
```

## Notes

- Terminal output stays focused on interactive prompts and user-facing interactions.
- Inference progress messages are now file-logged through `beerLogLine`.
- Release command subprocess stdout/stderr is file-logged instead of streamed to screen.
