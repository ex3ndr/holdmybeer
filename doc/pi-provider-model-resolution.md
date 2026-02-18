# Pi Provider And Model Resolution

This change replaces legacy direct provider execution with a single `pi` provider.

```mermaid
flowchart TD
  A[bootstrap/contextInitialize] --> B[providerDetect]
  B --> C[probe: pi --version]
  C --> D[providerModelsGet via pi --mode rpc]
  D --> E[get_available_models response]
  E --> F[Context.providers with model list]
  F --> G[generate workflow step]
  G --> H[providerModelSelect by workflow modelPriority]
  H --> I[providerGenerate: pi --mode json --print --model]
  I --> J[outer sandbox wrapper]
  J --> K[parse JSON message_end assistant content]
```

## Notes

- Provider detection now stores normalized model identifiers in `provider/models` format.
- Workflows provide ordered `modelPriority` lists and resolve against live available models.
- Inference runs in pi JSON mode; verbose output prints raw JSON event lines through existing progress logging.
- Sandbox auth write allowance now targets `~/.pi`.
