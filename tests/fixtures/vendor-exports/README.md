# Vendor Export Staging

This folder is for local parser exploration only.

## Repo Rule

- do not commit full raw vendor exports here
- keep this folder ignored by git except for this README
- promote only trimmed, minimal, intentionally reviewed fixtures into `tests/fixtures/`
- if a parser needs a vendor-specific example, extract the smallest representative sample and remove unrelated conversations, attachments, and personal data first

## Local-Only Workflow

You can temporarily place local raw exports here using vendor subfolders such as:

- `tests/fixtures/vendor-exports/claude/`
- `tests/fixtures/vendor-exports/gemini/`
- `tests/fixtures/vendor-exports/copilot/`
- `tests/fixtures/vendor-exports/perplexity/`
- `tests/fixtures/vendor-exports/grok/`
- `tests/fixtures/vendor-exports/deepseek/`
- `tests/fixtures/vendor-exports/kimi/`

Keep the raw export structure exactly as the vendor provides it while inspecting locally. Do not normalize inner files before parser work.

## What Belongs In Git

Tracked fixtures should live in `tests/fixtures/` and should be:

- small
- anonymized where needed
- representative of one parser shape or edge case
- easy to reason about in tests

The current curated examples already follow that model:

- `sample-chatgpt-conversation.json`
- `sample-claude-conversation.json`
- `sample-gemini-conversation.json`
- `sample-grok-export.json`
- generic conversation shape samples

## Versioned Vendor Fixture Recommendation

When a vendor export format changes over time, avoid treating one fixture as if it represents every historical package shape.

Prefer versioned or date-labeled local staging folders such as:

- `tests/fixtures/vendor-exports/chatgpt/2026-03-13/`
- `tests/fixtures/vendor-exports/chatgpt/2026-07-large-sharded/`
- `tests/fixtures/vendor-exports/gemini/2026-07-my-activity/`

Then promote only the smallest safe representative samples into tracked fixtures under `tests/fixtures/`, using names that preserve the shape distinction when it matters.

Examples:

- `sample-chatgpt-conversation-2026-03.json`
- `sample-chatgpt-export-manifest-sharded.json`
- `sample-chatgpt-chat-html-legacy.html`

This matters because Quantum's import logic can depend on:

- exact package filenames such as `chat.html` or `export_manifest.json`
- shard naming conventions such as `conversations-000.json`
- embedded HTML markers such as `var jsonData =`

If the vendor changes those conventions, one generic fixture can give false confidence.

## Useful Inspection Command

```powershell
node .\node_modules\tsx\dist\cli.mjs core\imports\inspectConversationFixture.ts "tests\fixtures\sample-generic-conversation.json"
```

If you need to inspect a local raw vendor export, point the command at the untracked file inside this folder.
