# Walkthrough History

| Date | Scenario | Result | Important finding | Status |
| --- | --- | --- | --- | --- |
| 12 Jul 2026 | Large ChatGPT rerun | Passed | Unchanged rerun completed through safe reuse | Closed |
| 14 Jul 2026 | Fresh output workspace, partial import | Partial | Import activity appeared lost after navigating away | Fixed |
| 15 Jul 2026 | Fresh output workspace with new free-account ChatGPT export | Passed | Ordinary import, archive, and dataset flow felt easy to follow; next improvement is broader workspace activity logging | Active follow-up |
| 15 Jul 2026 | Windows packaged app and installer validation against an already-populated output root | Passed | Both the unpacked app and installed build recognized the existing workspace, reused prior outputs cleanly, and kept archive, dataset, and activity surfaces coherent | Closed |
| 20 Jul 2026 | Fresh GitHub-installer walkthrough with a real ChatGPT export and the synthetic demo export | Passed | Core workflow, Activity History, and hidden advanced tools were exercised successfully on a fresh install | Closed |
| 20 Jul 2026 | Fresh Grok export in a shared ChatGPT output root | Passed | ChatGPT and Grok content remained viewable from one local workspace | Closed |
| 20 Jul 2026 | Fresh Claude export in a shared ChatGPT and Grok output root | Passed | One workspace showed 364 searchable import records across ChatGPT, Grok, and Claude | Closed |
| 20 Jul 2026 | Current Microsoft Copilot activity CSV | Blocked | Valid populated CSV begins with a UTF-8 BOM; strict header comparison reports a vendor mismatch | Pre-beta compatibility fix |
| 21 Jul 2026 | Current raw Copilot CSV, Claude, Grok, and current sharded ChatGPT export in one output root | Passed | Copilot joined the shared searchable workspace; the completed ChatGPT run processed 10 of 10 conversation shards, with 8 package companions skipped as intended. Find Imports showed four visible vendors, 1,000 conversations, and 27,017 messages. | Closed for candidate walkthrough |
| 21 Jul 2026 | Legacy ChatGPT `chat.html` compatibility path | Partial | Export Check recognized the legacy package, but no file-level progress appeared before a safe force-stop. Activity History clearly recorded the stop and warned that the run was not completed output. | Observe during beta; current sharded export remains the recommended path |
| 21 Jul 2026 | Large four-vendor shared workspace review | Passed with performance observation | Readable Archive loaded 999 conversations across 11,188 topic groups and 14,596 readable files. Datasets also loaded, and did so sooner in this observed workspace. | Documented; optimize only with further beta evidence |
