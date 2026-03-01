# Ralph Without Bootstrap

The workflow picker now allows `ralph` to run before `.beer` bootstrap settings
are configured.

## Behavior

- `bootstrap`: always available
- `ralph`: always available
- all other workflows: available only after bootstrap state is present

```mermaid
flowchart TD
  A[Workflow selected] --> B{Bootstrap state present?}
  B -->|Yes| C[Allow all workflows]
  B -->|No| D{workflow id}
  D -->|bootstrap| E[Allow]
  D -->|ralph| E
  D -->|other| F[Disable with bootstrap-required hint]
```
