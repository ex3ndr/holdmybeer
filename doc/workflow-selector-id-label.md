# Workflow Selector ID Label

Workflow choices in the CLI selector now display the workflow ID together with the title.

## Flow

```mermaid
flowchart TD
  A[workflows registry] --> B[sources/main.ts]
  B --> C[build choices]
  C --> D[name = workflow.id + colon + workflow.title]
  D --> E[@inquirer/select renders choices]
```

## Notes

- This makes the selected operation explicit, especially when titles are long or similar.
- The selected value remains `workflow.id`; only display text changed.
