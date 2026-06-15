# Governance Natural Language Flow

## Goal
Let users draft governance rules in common language without allowing free-text to mutate live policy directly.

## Flow
1. User selects a governance rule file
2. User writes a plain-language instruction
3. System generates a structured canonical JSON draft
4. User reviews the preview
5. User moves the draft into the raw editor
6. User saves only after review and validation
7. Backend validates, backs up, writes, and logs report

## Principle
Natural language is a drafting layer.
Canonical JSON remains the authority layer.
