# Vendor Export Fixtures

Place small raw export samples from each vendor here using the following folder structure:

- `tests/fixtures/vendor-exports/claude/`
- `tests/fixtures/vendor-exports/gemini/`
- `tests/fixtures/vendor-exports/perplexity/`
- `tests/fixtures/vendor-exports/grok/`
- `tests/fixtures/vendor-exports/deepseek/`
- `tests/fixtures/vendor-exports/kimi/`

## Guidance

- keep the raw export structure exactly as the vendor provides it
- do not manually normalize inner files before parser work
- prefer small samples first rather than full history exports
- if the vendor export includes root manifest JSON plus UUID or blob folders, keep both together
- include a mix of:
  - short single-turn conversations
  - longer multi-turn conversations
  - code-heavy conversations
  - conversations with citations, attachments, or tool output if present

## Useful inspection command

Use this before implementing a new parser:

```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\inspectConversationFixture.ts "tests\fixtures\vendor-exports\claude\sample.json"
```

For Grok exports, point the inspector at `prod-grok-backend.json` or `prod-grok-backend 1.json`, not the individual blob folders.

This prints:

- detected parser family
- top-level keys
- candidate conversation container paths
- candidate message field keys
- sample parsed roles and messages
