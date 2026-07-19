# OpenAI Build Week Submission

## Status

Submission preparation for the `0.1.0-beta.1` candidate.

This document is the authoritative checklist for the submission snapshot. It complements the private-beta roadmap; it does not replace it.

## Project summary

### Title

SkillSpring Quantum

### Tagline

Turn AI conversation exports into searchable local archives.

### Description

AI conversations are useful when they happen, but become difficult to recover once they disappear into long chat histories. SkillSpring Quantum is a local-first Windows desktop app that imports supported AI conversation exports and turns them into readable archives, searchable history, and privacy-aware datasets.

Users inspect an export before processing it, keep the resulting workspace on their own machine, and can later browse readable conversation slices, inspect structured output, or find material they remember asking about. The deterministic import pipeline remains authoritative; the optional local assistant is secondary.

Quantum was built with Codex and GPT-5.6 as engineering collaborators for codebase inspection, TypeScript and Electron refactoring, recovery safeguards, regression tests, packaged-runtime debugging, and product documentation.

## Reviewer path

### Windows installer

The final submission installer must be rebuilt from the submission commit and named with the beta version.

### Synthetic demo path

For a no-account, no-personal-data evaluation:

1. Open Quantum and choose `Imports`.
2. Select [`examples/build-week-demo/chatgpt-conversations.json`](../../examples/build-week-demo/chatgpt-conversations.json).
3. Run `Export Check`, then import the same file.
4. Review `Readable Archive`, `Datasets`, and `Find Imports`.
5. Try `back pain`, `quitting smoking`, `garden`, or `weekend trip`.

The sample export is entirely synthetic and was verified through the streaming ChatGPT import path.

## Submission assets

### README gallery

- [`02-export-check-valid.png`](../assets/screenshots/02-export-check-valid.png)
- [`05-readable-archive-overview.png`](../assets/screenshots/05-readable-archive-overview.png)
- [`06-datasets-overview.png`](../assets/screenshots/06-datasets-overview.png)
- [`07-find-imports-overview.png`](../assets/screenshots/07-find-imports-overview.png)
- [`08-installer-complete-beta-1.png`](../assets/screenshots/08-installer-complete-beta-1.png)

### Demo-video sequence

Keep the video under three minutes.

Demo video: [Watch on YouTube](https://www.youtube.com/watch?v=pldsPIb_Evo)

1. Problem and local-first promise.
2. Export Check using the synthetic demo.
3. Import progress and Activity History.
4. Readable Archive and Datasets.
5. Find Imports using one memory-based query.
6. How Codex and GPT-5.6 supported the build.

## Final checklist

- [x] Product-first README
- [x] Reviewed public screenshots
- [x] Synthetic reviewer export
- [x] Codex and GPT-5.6 development narrative
- [x] Streaming-resume finalisation regression coverage
- [x] All `test:ci` suites pass when run in groups; the combined wrapper exceeds the local two-minute command limit
- [x] Normal `npm run build`
- [x] Rebuild `npm run package:win` as `SkillSpring-Quantum-0.1.0-beta.1-Setup.exe`
- [ ] Install and run the final installer on the clean laptop
- [x] Record and host the demo video: [YouTube](https://www.youtube.com/watch?v=pldsPIb_Evo)
- [ ] Confirm the live Devpost form and submit before its stated deadline
