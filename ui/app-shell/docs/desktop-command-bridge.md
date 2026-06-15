# Desktop Command Bridge

## Goal
Define a stable contract between the desktop UI and backend command layer.

## Principle
The UI should not invent backend behavior.
It should call a bounded command bridge with explicit payload types and explicit responses.

## Command catalog

### pipeline.runFile
Payload:
- inputFile
- outputRoot

Maps to:
npm run run:file -- "<inputFile>" "<outputRoot>"

### batch.run
Payload:
- inputFolder
- outputRoot

Maps to:
npm run batch:run

### batch.diagnostics
Payload:
- outputRoot

Maps to:
npm run batch:diag

### batch.delta
Payload:
- outputRoot

Maps to:
npm run batch:delta

### db.review.buildQueue
Payload:
- outputRoot

Maps to:
npm run db:review

### db.review.decide
Payload:
- outputRoot
- decision
- queueKey
- reason

Maps to:
npm run db:review:decide -- "<outputRoot>" "<decision>" "<queueKey>" "<reason>"

### db.promote
Payload:
- outputRoot

Maps to:
npm run db:promote

### diagnostics.run
Payload:
- outputRoot

Maps to:
npm run diag:run

### folders.merge
Payload:
- outputRoot

Maps to:
npm run folders:merge

### purge.restore
Payload:
- sourceFile
- outputRoot

Maps to:
npm run purge:restore -- "<sourceFile>" "<outputRoot>"

## Response model
Every command should resolve to:
- ok: true/false
- command
- result or error
- optional message

## Desktop shell responsibility
The desktop shell should translate typed requests into local command execution and return typed results to the UI.
