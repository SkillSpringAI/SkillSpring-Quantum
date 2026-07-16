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
7. Review `Archive`
8. Use `Search / Retrieval` to find prior material
9. Open `Datasets` when you want structured output

## Supported exports

- ChatGPT / OpenAI
- Claude
- Gemini
- Grok
- Microsoft Copilot activity CSV for the validated export shape

Fallback support:

- Gemini My Activity HTML

## Main screens

- `Dashboard`: quick view of recent activity and workflow entry points
- `Imports`: inspect an export and start an import
- `Archive`: browse readable local output
- `Search / Retrieval`: revisit prior imports by text, topic, vendor, date, and status
- `Datasets`: inspect structured outputs generated from imported material
- `Activity History`: review what Quantum did and where the workflow went next

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
