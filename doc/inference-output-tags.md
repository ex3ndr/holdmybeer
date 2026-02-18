# Inference Output Tags

Inference prompts now require providers to return the final text inside `<output>...</output>` tags.

## Flow

```mermaid
flowchart TD
  A[generateText prompt] --> B[Append output-tag instruction]
  B --> C[Run provider]
  C --> D{Contains <output>?}
  D -->|yes| E[Extract tagged text and return]
  D -->|no| F[Retry same provider with reminder]
  F --> G{Contains <output>?}
  G -->|yes| E
  G -->|no| H[Record provider failure]
```

## Retry Reminder

When tagged output is missing, the retry appends:

`Last time you didnt return <output> - do this now`
