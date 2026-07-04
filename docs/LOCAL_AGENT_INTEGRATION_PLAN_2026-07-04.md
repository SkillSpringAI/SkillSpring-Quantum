# Local Agent Integration Plan - 2026-07-04

This note records how the newly added `skillspring-quantum-agent/` package should be integrated into SkillSpring Quantum.

It is now complemented by the broader product-level action plan at:

- `docs/LOCAL_AI_INTEGRATION_ACTION_PLAN_2026-07-05.md`

The short answer:

The local agent fits Quantum well, but it should be integrated as the **assistant interpretation surface** described in the existing docs, not as a new core workflow that competes with Imports, Readable Archive, Datasets, or Find Imports.

Update as of July 5, 2026:

- the first narrow command-bridge version is now implemented in the `Ask Quantum` drawer
- it routes a small set of plain-language requests through validated Quantum actions first
- broader explanation still falls back to the local assistant only when the request is not one of those supported deterministic actions

## What Was Added

The new folder contains a local-first agent package with:

- local LLM providers
- local embedding providers
- SQLite vector storage
- archive and dataset tools
- chat session memory
- CLI and HTTP server entry modes
- pipeline hook stubs for indexing after imports

Important packaging notes:

- the package docs may still describe a simpler top-level `agent/` path, but the current repo uses `skillspring-quantum-agent/agent/` as the canonical implementation location
- the repo now includes agent scripts and TypeScript wiring for that nested path

## Integration Decision

The agent should be incorporated in **three layers**, in this order:

1. **Operator-accessible local assistant backend**
   - make it startable, health-checkable, and queryable inside the repo
   - do not expose it as a primary user flow yet

2. **Contextual UI explainer**
   - use it to explain what the current screen means
   - use it to answer "what should I do next?" in plain language
   - use it to summarize the currently selected archive file, dataset slice, or import status

3. **Optional chat-style retrieval surface**
   - only after the first two layers are stable
   - only after parser and retrieval hardening are good enough for outside beta

## Deterministic-First Boundary

The local agent remains an optional interpretation and control layer.

It must not weaken the deterministic-first Quantum contract:

- imports, archive generation, dataset generation, validation, and output writing must still work without the agent
- the chatbot may translate user intent into supported structured actions, but it must not bypass the deterministic pipeline
- AI-generated labels, summaries, and grouping suggestions belong to a separate semantic layer, not the canonical source layer

## What It Should Not Become Yet

- not a replacement for the deterministic import -> archive -> dataset pipeline
- not a new primary navigation destination at the same level as Imports or Datasets
- not a reason to expand beyond the current MVP vendor boundary
- not a mandatory dependency for understanding core results

Quantum still needs to stand on its own when the local model stack is unavailable.

## Best UI Shape

The simplest UI shape is **not** "add an Agent screen."

The simplest UI shape is:

- a global `Ask Quantum` action in the top bar
- a contextual right-side drawer or modal
- seed prompts based on the current screen and current selection

Examples:

- on Imports: `Explain this export check`, `Why did this import use a fallback path?`, `What should I check next?`
- on Readable Archive: `Summarize this conversation`, `What topic is this really about?`, `Should I stay in archive or open dataset view?`
- on Datasets: `Explain this preview`, `What does this redaction summary mean?`, `What stands out in this run?`
- on Find Imports: `Help me find the conversation about...`, `Why did this result match?`

This approach makes the UI feel simpler because we can move more always-visible instructional copy into on-demand explanation.

## Concrete Repo Integration Plan

### Phase 0: Repo hygiene

- keep `skillspring-quantum-agent/agent/` as the current canonical package location
- only consider flattening later if the repo structure is deliberately simplified in a future cleanup pass
- decide whether agent docs stay inside the package folder or get mirrored into `docs/`

### Phase 1: Local runtime wiring

- add package scripts for health, index, server, and query modes
- update `tsconfig.json` include paths so the agent compiles with the repo
- verify the current Node runtime assumption against actual Electron/dev environment behavior
- keep the first target to CLI usability and health checks, not UI exposure

### Phase 2: Electron bridge

- spawn the agent server from Electron main only when enabled
- add IPC wrappers for:
  - `agent:health`
  - `agent:start`
  - `agent:stop`
  - `agent:chat`
  - `agent:sessions:list`
  - `agent:sessions:create`
  - `agent:index`
- route renderer access through preload, matching the existing Quantum desktop bridge pattern

### Phase 3: Context-aware UI adoption

- add a top-bar `Ask Quantum` entry instead of a permanent left-nav screen
- start with read-only explanation flows
- pass current screen context into prompts:
  - selected import result
  - selected archive file
  - selected dataset preview item
  - active retrieval filters or selected result
- show cited sources from the archive or dataset in every assistant answer

What changed in practice:

- the drawer now also exposes a supported-actions layer for commands like inspect export, run import, open archive, open datasets, search completed outputs, and rebuild the local search index
- this was prioritized before deeper chat behavior because it improves usability without weakening the deterministic-first contract

### Phase 4: Automatic indexing

- connect real import completion events to agent indexing
- index archive and dataset outputs incrementally
- keep indexing asynchronous and non-blocking
- surface indexing state quietly in Settings or a lightweight status chip rather than a new primary panel

## Notes Needed To Fully Wire It In

The following implementation notes should be added before coding begins:

1. **Canonical folder contract**
   - document where the agent truly lives in this repo
   - document whether the nested package form is temporary or final

2. **Availability contract**
   - define the behavior when Ollama or embeddings are unavailable
   - define whether the UI hides assistant features or shows a disabled educational state

3. **Source-grounding contract**
   - every assistant response should cite archive files, dataset records, or import summaries
   - the agent should explain grounded evidence, not invent unsupported conclusions

4. **Performance contract**
   - define when indexing runs
   - define how often re-indexing happens
   - define what large-output-root behavior is acceptable before beta

5. **UI tone contract**
   - the agent should reduce explanatory overload, not create a second explanation system with different language
   - prompt suggestions should use plain task wording, not internal system labels

6. **Two-layer data contract**
   - keep canonical source facts separate from semantic enrichment metadata
   - never let AI-generated interpretations silently replace vendor-provided structure or source-grounded archive facts

## Beta-Facing Recommendation

Before external beta, the best use of this agent is:

- a contextual explainer for the current four-screen workflow
- a retrieval helper for "help me find the conversation about..."
- a plain-language interpreter of trust, fallback, redaction, and preview states

The worst use of it before beta would be:

- making chat the main product before deterministic retrieval and parser quality are hardened enough

## Recommended Immediate Next Slice

The next practical slice should be a documentation-and-runtime preparation pass:

1. normalize the folder structure
2. add scripts and TypeScript include wiring
3. define the Electron/IPC integration contract
4. define the first contextual UI entry point as `Ask Quantum`

Only after that should the first assistant-backed UI element be implemented.

That first assistant-backed UI element now exists, so the next assistant work should be narrower follow-through:

1. expand supported phrasing without making action parsing opaque
2. improve clarification behavior for underspecified commands
3. strengthen source-grounded explanation around command results
4. keep the assistant attached to the existing four-screen workflow instead of growing a parallel product surface

Supporting notes:

- runtime contract: `docs/LOCAL_AGENT_RUNTIME_CONTRACT_2026-07-04.md`
- UI incorporation notes: `docs/LOCAL_AGENT_UI_INCORPORATION_NOTES_2026-07-04.md`
- broader action plan: `docs/LOCAL_AI_INTEGRATION_ACTION_PLAN_2026-07-05.md`
