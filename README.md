# SkillSpring Quantum

Quantum is a local-first Windows desktop app for turning AI conversation exports into readable archives, searchable history, and privacy-aware datasets.

It is built for people who want to keep AI history on their own machine, revisit conversations later, and work across more than one assistant without uploading those exports to another service.

## Current Status

**Private beta preparation.** The core Windows workflow is implemented and validated. Quantum is preparing for a small external beta focused on usability and real-world feedback.

`Ask Quantum` is still experimental and should not yet be treated as the primary or fully reliable workflow path.

## Why Quantum

- Search conversations you remember asking
- Keep AI history local
- Browse readable archives instead of raw export files
- Find conversations across supported AI assistants
- Build structured datasets when needed

## Core Workflow

Export AI conversations

↓

Open Quantum

↓

Import the export

↓

Review the archive

↓

Search previous conversations

↓

Explore datasets when needed

## Supported Exports

Current supported vendors for the private beta path:

- ChatGPT / OpenAI
- Claude
- Gemini
- Grok
- Microsoft Copilot activity CSV for the validated export shape

Compatibility fallback:

- Gemini My Activity HTML

## Platform

- Windows

## Screens

The current product includes dedicated views for:

- Dashboard
- Imports
- Archive
- Datasets
- Activity History
- Search / Retrieval

The main beta path is still:

`Imports -> Readable Archive -> Datasets -> Search / Retrieval`

`Ask Quantum`, Diagnostics, Governance, and the other extra tools are follow-up tools rather than the primary evaluator path today.

Screenshot documentation is being prepared alongside the private beta packaging pass.

## Installation

### Users

Quantum is currently being prepared for private beta distribution on Windows.

Planned user flow:

1. Download the Windows installer
2. Install Quantum
3. Launch the app
4. Import a supported AI export

See the [Beta Guide](docs/user/BETA_GUIDE.md) and [User Guide](docs/user/USER_GUIDE.md) for the current workflow and expectations.

### Developers

Development setup, scripts, packaging, and test commands live in the [Development Guide](docs/technical/DEVELOPMENT_GUIDE.md).

## Documentation

- [User Guide](docs/user/USER_GUIDE.md)
- [Export Guides](docs/user/exports/README.md)
- [FAQ](docs/user/FAQ.md)
- [Known Limitations](docs/user/KNOWN_LIMITATIONS.md)
- [Beta Guide](docs/user/BETA_GUIDE.md)
- [MVP Roadmap](docs/project/MVP_ROADMAP.md)
- [Project History](docs/project/PROJECT_HISTORY.md)
- [Architecture](docs/technical/ARCHITECTURE.md)
- [Development Guide](docs/technical/DEVELOPMENT_GUIDE.md)
- [Technical Reference](docs/reference/TECHNICAL_REFERENCE.md)
- [Contributing](CONTRIBUTING.md)

## For Contributors

If you are evaluating the codebase rather than the product, start with:

- [docs/README.md](docs/README.md)
- [Architecture](docs/technical/ARCHITECTURE.md)
- [Development Guide](docs/technical/DEVELOPMENT_GUIDE.md)
- [Testing](docs/technical/TESTING.md)
