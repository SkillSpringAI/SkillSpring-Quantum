# Beta Readiness Implementation

## Status

Active pre-private-beta checklist, updated July 21, 2026.

This is the short operational companion to the [MVP Roadmap](../project/MVP_ROADMAP.md). It records only the remaining local verification, bounded fixes, and walkthrough evidence needed before external testers receive Quantum.

## Evidence already recorded

- `0.1.0-beta.1` is submitted to OpenAI Build Week and published as a GitHub prerelease.
- The installer has been downloaded from GitHub and installed on a separate laptop.
- A full fresh walkthrough completed with both a real ChatGPT export and the synthetic Build Week demo export.
- The core workflow, Activity History, and the hidden advanced-tools screen were exercised.
- Governance redaction worked during manual testing. Its phrase matching is intentionally conservative today; for example, a rule for `bank` also matches `Reserve Bank of New Zealand`.
- Fresh Grok, Claude, Copilot, and current sharded ChatGPT exports imported into one output root; Find Imports showed all four vendors together across 1,000 conversations and 27,017 messages.
- The current sharded ChatGPT export processed 10 of 10 conversation files cleanly. Its legacy `chat.html` compatibility path did not show file-level progress before a safe force-stop, so the current export remains the documented normal route.
- A four-vendor workspace with 11,188 topic groups and 14,596 readable files loaded both Readable Archive and Datasets. Readable Archive took longer; this is documented guidance rather than an immediate optimization project.
- The first local `0.1.0-beta.2` package exposed an Auto Detect gap in the Gemini guard. It was not released. The corrected `0.1.0-beta.3` candidate passed the local build, full regression, and Windows packaging gates.

## Current local candidate

- Version: `0.1.0-beta.3`
- Installer: `SkillSpring-Quantum-0.1.0-beta.3-Setup.exe`
- SHA-256: `B818DD080BE92A914AA0C004AF370BF930B1DE205E06A31F61A0964AF0534004`
- Status: local packaged candidate only; do not replace the submitted `0.1.0-beta.1` Build Week release.

## Confirmed issue: current Microsoft Copilot CSV

**Status: implementation complete; packaged walkthrough pending**

The current `copilot-activity-history.csv` downloaded from Microsoft is non-empty and otherwise matches Quantum's named activity-CSV shape:

- 565 lines / 28.7 KB
- columns: `Conversation,Time,Author,Message`
- populated Human and AI rows

It begins with a UTF-8 byte-order mark (BOM). Quantum currently compares the first header literally, so it sees `\uFEFFConversation` instead of `Conversation` and reports a vendor mismatch.

Implemented:

1. Strip one leading UTF-8 BOM before Copilot CSV header detection and parsing.
2. Add a regression fixture or test that preserves the BOM.
3. Preserve the exact raw-export shape in automated intake coverage.

Packaged walkthrough: passed in a shared output root. The raw CSV was recognized, imported, and remains searchable alongside ChatGPT, Claude, and Grok.

Do not broaden Copilot parsing beyond this proven issue until new evidence appears.

## Confirmed issue: Gemini attachment-only Takeout

**Status: implementation complete; packaged walkthrough pending**

The inspected Google Takeout root contains a Gemini Apps attachment folder but no parseable Gemini conversation-history export:

- 202 JPGs, 17 PNGs, 39 PDFs, 5 DOCX files, and 1 XLSX file
- two 11-byte Gemini HTML placeholders for Gems and scheduled actions
- no Gemini conversation JSON, CSV, or activity-history HTML containing conversation text

The first local `0.1.0-beta.2` candidate still processed the attachment PDFs through the generic document path under Auto Detect. This was not a valid Gemini conversation import and is now explicitly blocked in `0.1.0-beta.3`.

Implemented:

1. Detect a Google Takeout / Gemini Apps attachment-only path, including when the nested Gemini folder is selected directly.
2. Require a detected Gemini activity or conversation source before the named Gemini route can enable import.
3. Show a recovery message at Export Check: re-export with **My Activity -> Gemini Apps** selected for chat activity.
4. Block the attachment-only Gemini Takeout package in both named Gemini and Auto Detect paths. Generic PDFs remain a separate capability only when selected outside that rejected package.
5. Cover the attachment-only shape with an intake regression test.

Still required: verify this result through the packaged beta candidate's Export Check before recording the walkthrough row as passed.

Google's current export instructions distinguish the `Gemini` selection for Gems from `My Activity -> Gemini Apps` for Gemini chats, generated media, and uploads. Verify the live export guide before changing the user-facing wording.

## Required local automated gate

Run these from the release-candidate commit:

```bash
npm run build
npm run test:ci
npm run package:win
```

If the combined test wrapper exceeds the local command window, run and record the grouped suites instead:

```bash
npm run test:parser:coverage
npm run test:imports
npm run test:smoke:vendors
npm run test:retrieval
npm run test:pipeline
npm run test:assistant
npm run test:governance
```

For every installer given to a tester, record the version, commit, filename, and SHA-256 checksum.

## Required local walkthroughs

Use a fresh output root outside the repository unless the scenario explicitly tests shared-workspace behaviour.

| Scenario | Expected result | Status |
| --- | --- | --- |
| Download and install the GitHub prerelease on a clean Windows environment | Launches without Node, npm, Git, or repository files | Passed for `0.1.0-beta.1` |
| Synthetic demo export | Export Check, import, archive, datasets, and Find Imports complete | Passed |
| Fresh real ChatGPT export | Core workflow completes in a new output root | Passed |
| Fresh Grok export in an existing ChatGPT output root | Both vendors remain visible and usable | Passed |
| Current raw Copilot activity CSV | Recognizes, imports, and remains visible with other vendors | Passed in shared four-vendor workspace |
| Gemini attachment-only Takeout | Stops at Export Check without processing attachment documents as Gemini conversations | Implementation verified locally; packaged walkthrough required |
| Fresh Claude export in the shared output root | Claude and existing vendor content remain visible and usable | Passed: ChatGPT, Claude, Copilot, and Grok visible together |
| Same-export rerun | Honest reuse is shown without duplicated outputs | Required per candidate |
| Stop an active import | App remains usable; the stopped run is explicitly not treated as completed output | Passed for legacy ChatGPT `chat.html`; large current-export stop/recovery remains optional additional evidence |
| Clearly wrong source or wrong vendor selection | Export Check explains the issue without importing | Required per candidate |
| Uninstall and reinstall | Record retained local workspace behaviour and any SmartScreen friction | Required before wider beta distribution |

## Support-readiness check

Before the first external tester, confirm the maintainer can tell a tester:

- where their chosen output root is shown
- how to record the version and failed action
- which diagnostics may contain private conversation content
- which screenshots or metadata are safe to share
- that the app does not send telemetry or conversation content automatically

## Explicitly defer

- Redaction word-boundary or context-aware matching.
- Search ranking changes based on one maintainer query.
- Renaming `Find Imports` before repeated tester evidence.
- New vendor formats beyond the specific Copilot BOM compatibility fix.
- Broad UI redesigns, telemetry, or advanced support-bundle automation.

## Exit condition

Quantum is ready to start the small private beta when the Copilot CSV and Gemini intake regressions are fixed and tested, the required walkthrough rows are complete for the release candidate, support guidance is usable, and no unresolved import-integrity issue remains.
