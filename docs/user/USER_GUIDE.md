# User Guide

## Audience

This guide is for general users and private beta testers.

## What Quantum does

Quantum imports supported AI conversation exports and turns them into:

- readable local archives
- searchable import history
- privacy-aware dataset outputs

Everything in the current workflow is local-first. Your source exports stay on your own machine.

## Supported export workflow

Current private beta workflow:

1. Export your conversation history from a supported AI product
2. Open Quantum
3. Go to `Imports`
4. Choose the file or folder you exported
5. Run `Export Check`
6. Import from that same path
7. Review `Readable Archive`
8. Open `Datasets` when you want structured output
9. Use `Find Imports` to find prior material
10. Check `Activity History` when you want to verify or recover what happened

## Supported exports

- ChatGPT / OpenAI
- Claude
- Gemini
- Grok
- Microsoft Copilot activity CSV for the validated export shape

Fallback support:

- Gemini My Activity HTML

For export-specific instructions, see the [Export Guides](exports/README.md).

## Before you export

The vendor workflows are not all alike.

- ChatGPT and Claude may send the export later rather than downloading immediately
- Gemini is more confusing because Google splits export selection across more than one category
- Grok should be treated separately from X archive export unless the Grok guide says otherwise
- Microsoft Copilot currently has a validated CSV path, but that does not mean every Microsoft export format is supported

If you are unsure which file to choose after downloading, start with the relevant vendor guide and then use `Export Check` in Quantum before running a full import.

## Main screens

- `Dashboard`: quick view of recent activity and workflow entry points
- `Imports`: inspect an export and start an import
- `Readable Archive`: browse readable local output by topic group, date, and conversation slice before moving into structured datasets
- `Datasets`: inspect structured outputs generated from imported material
- `Find Imports`: revisit prior imports by text, topic, vendor, date, and status
- `Activity History`: verify what Quantum did and recover context when something is unclear

## How to read the Readable Archive screen

Start in `Readable Archive` after import.

This screen is designed to help you recognize the right conversation again before you switch into more structured views.

Useful cues on this screen:

- topic groups help jog memory
- dates help place a conversation in time
- filenames and preview snippets help confirm you opened the right slice

Longer conversations can appear more than once because Quantum breaks them into readable review windows instead of one oversized file.

The normal path is:

1. use topic and date clues to find the right conversation
2. open the readable markdown slice
3. move to `Datasets` only when you want the structured version of what you just reviewed

## What to expect after import

After a successful import, Quantum can produce:

- readable markdown archives
- import history records
- retrieval indexes for later search
- privacy-aware dataset artifacts

## Safety and privacy

- Quantum is local-first
- The optional local AI layer is not required for the main workflow
- Deterministic import results remain the authoritative record
- You should only import exports you are comfortable reviewing locally and are authorized to use

## Next reading

- [FAQ](FAQ.md)
- [Known Limitations](KNOWN_LIMITATIONS.md)
- [Beta Guide](BETA_GUIDE.md)
- [Export Guides](exports/README.md)
