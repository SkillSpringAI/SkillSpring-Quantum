# Local Agent UI Incorporation Notes - 2026-07-04

This note narrows how the local agent should simplify the Quantum UI once the backend wiring is ready.

## Primary Rule

The agent should remove explanation burden from the main screens.

It should not create a second product to learn.

## Best First Entry Point

Preferred first UI shape:

- top-bar `Ask Quantum` button
- opens a drawer or modal
- preloads contextual prompt suggestions based on the current screen

Avoid for now:

- a permanent new left-nav item
- a blank chat canvas as the first assistant experience
- duplicate explanation panels on every screen

## Screen-Specific Use

### Imports

Good first prompts:

- `Explain this export check`
- `Why did this import use a fallback path?`
- `What should I do next?`

UI simplification effect:

- move some dense export-check teaching copy into on-demand help
- keep the screen focused on choose, check, import, continue

### Readable Archive

Good first prompts:

- `Summarize this conversation`
- `What topic is this really about?`
- `Should I stay in archive or open dataset view?`

UI simplification effect:

- reduce the need for long static "what am I looking at?" explanations
- make selected-file review feel guided without adding more cards

### Datasets

Good first prompts:

- `Explain this preview`
- `What does this redaction summary mean?`
- `What stands out in this run?`

UI simplification effect:

- keep trust and redaction visible
- move secondary educational text into contextual assistant help

### Find Imports

Good first prompts:

- `Help me find the conversation about...`
- `Why did this result match?`
- `What filters should I change?`

UI simplification effect:

- make retrieval feel less like a search form to be studied
- help outside users recover when they do not know the internal labels

## Response Requirements

Assistant responses in the UI should:

- cite the file, run, or dataset evidence they relied on
- stay short by default
- speak in task language, not internal subsystem language
- end with a next action when useful

## Suggested UI Sequence

1. top-bar `Ask Quantum`
2. contextual drawer with screen-aware starter prompts
3. optional follow-up freeform question input
4. source chips linking back to the underlying archive or dataset context

## Beta Rule

Before external beta, the assistant should primarily help users:

- understand what Quantum found
- understand what to do next
- find the right conversation or dataset slice

It should not yet become the main way to operate the product.
