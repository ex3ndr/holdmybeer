# Generate Frontmatter

`generateFrontmatter` adds schema-verified frontmatter generation for workflow steps that write markdown-like files.

## Flow

```mermaid
flowchart TD
  A[generateFrontmatter called] --> B[Resolve output path in project]
  B --> C[Call generateFile with verify callback]
  C --> D{Path matches expected file?}
  D -->|no| E[Throw path error]
  D -->|yes| F{Frontmatter exists?}
  F -->|no| G[Throw missing frontmatter error]
  F -->|yes| H[Parse frontmatter with gray-matter]
  H --> I{Zod schema safeParse success?}
  I -->|no| J[Throw schema validation error]
  I -->|yes| K[Return generation result]
```

## Rules

- Frontmatter is required for the generated file.
- Frontmatter must be parsed via `gray-matter`.
- Frontmatter data must pass the caller-provided Zod schema.
- Validation failures throw and fail the workflow step.
