# Imports UI Flow

## Goal
Connect the desktop Imports screen to real backend run commands.

## Single-file flow
1. User selects single-file mode
2. User enters or picks export shard path
3. User selects output root
4. UI calls desktop bridge:
   - command: pipeline.runFile
   - payload: inputFile, outputRoot
5. Desktop shell executes local backend command
6. UI receives status result
7. Later: live stdout/stderr should stream into run log

## Batch flow
1. User selects batch mode
2. User enters or picks export folder
3. User selects output root
4. UI calls desktop bridge:
   - command: batch.run
   - payload: inputFolder, outputRoot
5. Desktop shell executes local batch runner
6. UI receives status result
7. Later: batch diagnostics and delta commands should be launchable from same screen

## Principle
Imports UI should reflect real local command flow, not pretend to perform processing itself.
