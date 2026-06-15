# Review Queue UI Flow

## Goal
Connect the backend review queue workflow to the desktop UI.

## Core flow
1. Load review queue records from tier2_curated/review_queue.topic_segments.jsonl
2. Show selectable queue rows in a table
3. Show selected record metadata and queue key
4. Require operator reason
5. Trigger backend decision:
   - approve
   - reject
6. Refresh queue after decision
7. Show resulting manifest or status

## Backend mapping
Approve maps to:
npm run db:review:decide -- "organized_output" approve "<queueKey>" "<reason>"

Reject maps to:
npm run db:review:decide -- "organized_output" reject "<queueKey>" "<reason>"

## UI principle
The UI should expose the actual backend decision flow, not invent a parallel approval model.
