# FAQ

## Audience

This document is for general users, beta testers, and evaluators.

## What problem does Quantum solve?

Quantum helps you keep AI conversation history locally, review it in a readable form, search across prior imports, and generate structured datasets from the same workflow.

## Why would I use Quantum instead of keeping the export files?

Raw exports are awkward to revisit. Quantum turns them into readable archives, searchable history, and structured outputs without asking you to upload them to another service.

## Is Quantum local-first?

Yes. The primary workflow is local-first and designed to work without sending your export data to a third-party service.

## Does Quantum require local AI to work?

No. The optional local AI layer is secondary. The deterministic import -> archive -> dataset workflow remains the primary product path.

The ordinary beta workflow is `Imports -> Readable Archive -> Datasets -> Find Imports`.

## Which AI exports are currently supported?

Current private beta support covers ChatGPT, Claude, Gemini, Grok, and the validated Microsoft Copilot activity CSV path. Gemini My Activity HTML remains a fallback path.

## Can I export from desktop/web, Android, or Apple devices?

It depends on the vendor.

For the current ChatGPT path:

- desktop/web export is supported through ChatGPT settings
- Android export is supported through the ChatGPT Android app
- iPhone and iPad users should use ChatGPT on the web for export rather than expecting the iOS app to provide the same export flow

For the current Claude path:

- web export is supported
- Claude Desktop export is supported
- Claude for iPhone, iPad, and Android does not currently provide the same export flow

For the current Gemini path:

- the safest path is Google Takeout on the web
- users may need to include both `Gemini` and `My Activity > Gemini Apps` depending on what they expect to export
- the export flow is more confusing than a single in-app download, so the vendor guide matters more here than usual

For the current Grok path:

- users should not assume Grok export and X archive export are the same thing
- the safest Quantum-facing assumption is to start from Grok.com or the Grok app `Data Controls` flow
- X also has its own archive request flow, but that should be treated as a separate export path unless the Grok guide says otherwise

For the current Microsoft Copilot path:

- Android can expose an export flow through Copilot account and privacy settings
- the current Quantum promise remains narrower than "all Copilot history everywhere" and stays centered on the validated CSV export shape
- users should check the vendor guide so they do not assume every Microsoft export format is equally supported

For other vendors, the safest current assumption is to start from the web or desktop flow unless the vendor guide says otherwise.

See the [Export Guides](exports/README.md) for vendor-specific instructions.

## Will I get the export instantly?

Not always.

For ChatGPT, the export is typically delivered after you request it rather than downloading immediately. OpenAI says ChatGPT sends an email or SMS message when the export is ready, that processing can take up to 7 days, and that the download link expires after 24 hours.

Large exports can take longer than small ones, so users should not assume the file will appear immediately after pressing export.

See the [ChatGPT Export Guide](exports/CHATGPT.md) for the current workflow.

For Claude, Anthropic says the export is processed first and then delivered by email as a download link. Anthropic also notes that there may be a small delay, the link expires after 24 hours, and you must be signed in to download your data.

See the [Claude Export Guide](exports/CLAUDE.md) for the current workflow.

For Gemini, Google Takeout lets you choose a delivery method and archive format during export. Users should not assume the export will be a single obvious chat-history download from inside Gemini itself.

See the [Gemini Export Guide](exports/GEMINI.md) for the current workflow.

For Grok, xAI says users can download data from Grok.com or the Grok mobile app through `Settings > Data Controls`, while X separately documents its own archive flow. Users should not assume those two archives are interchangeable.

See the [Grok Export Guide](exports/GROK.md) for the current workflow.

For Microsoft Copilot, the currently observed Android export flow can produce an immediate CSV download after the user reaches the Copilot activity-history export page and requests `Export all activity history`.

See the [Microsoft Copilot Export Guide](exports/COPILOT.md) for the current workflow.

## What platforms are supported?

Windows is the current private beta platform.

## Is Quantum a general document-ingestion tool?

Not in the current product promise. The current release focus is supported AI conversation exports.

## What does Quantum create after import?

It can create readable archives, search indexes, import history, and privacy-aware dataset artifacts.

## Which file should I select?

Start with the downloaded export file or the top-level extracted export folder. Then run `Export Check` in `Imports` before importing.

If the check does not recognize the export, read the relevant [Export Guide](exports/README.md) and try the top-level vendor export path rather than a random nested file.

## What is the difference between Readable Archive and Datasets?

`Readable Archive` is for human review. It preserves conversation slices as readable local markdown so you can recognize what happened.

`Datasets` is the structured layer. Use it after archive review when you want topic segments, prompt/response previews, redaction context, or dataset files.

## Which screen should I open first after a large import?

For large workspaces, start with `Find Imports` if you want the quickest immediate follow-up.

`Readable Archive` can take around 2 to 3 minutes to finish loading when the selected output root contains more than 12,000 readable slices. `Datasets` should currently be treated as a later follow-up screen rather than the first screen to open in very large workspaces.

## Why does the Readable Archive take longer than Find Imports?

The archive view is loading a much larger readable slice layer, topic grouping, and review-ready metadata for the current workspace.

That heavier archive layer is also why the current `Datasets` view may not feel ready until archive loading has settled first.

## Are Diagnostics ready for normal beta testing?

Not yet as a primary workflow.

Diagnostic files can still be written to disk, but the packaged app UI is not yet the most reliable way to inspect them. Batch comparison outputs should currently be treated as maintainer-facing follow-up work rather than part of the normal beta walkthrough.

## Does changing a governance rule force Quantum to rebuild datasets on the next rerun?

Yes for the import-affecting governance rules that participate in output generation and downstream curation.

As of Saturday, July 18, 2026, Quantum now treats changes to the relevant import governance snapshot as a reuse invalidation signal. If the source export is unchanged but the active import-affecting governance rules changed, Quantum should rerun instead of silently reusing the older output state.

## Is the project publicly launched?

No. As of Saturday, July 18, 2026, Quantum is preparing for a small private beta.
