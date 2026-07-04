# Local Agent Integration Plan - 2026-07-04

This note records how the newly added `skillspring-quantum-agent/` package should be integrated into SkillSpring Quantum.

The short answer:

The local agent fits Quantum well, but it should be integrated as the **assistant interpretation surface** described in the existing docs, not as a new core workflow that competes with Imports, Readable Archive, Datasets, or Find Imports.

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

- the package docs assume a top-level `agent/` path, but the current repo addition lives under `skillspring-quantum-agent/agent/`
- there is also an accidental-looking malformed subtree at `skillspring-quantum-agent/{agent/...` that should not be treated as canonical product structure
- the current repo `tsconfig.json` and `package.json` do not yet include the agent paths or helper scripts

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

- choose one canonical location for the package
  - preferred: move or flatten it into a real top-level `agent/`
  - acceptable alternative: keep `skillspring-quantum-agent/agent/` but update every doc/script/example to match
- remove or quarantine the malformed `skillspring-quantum-agent/{agent/...` subtree
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

Supporting notes:

- runtime contract: `docs/LOCAL_AGENT_RUNTIME_CONTRACT_2026-07-04.md`
- UI incorporation notes: `docs/LOCAL_AGENT_UI_INCORPORATION_NOTES_2026-07-04.md`
