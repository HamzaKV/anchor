---
"@varlabs/anchor": minor
---

Add a `--json` flag to `anchor status` and `anchor lift` that fully replaces stdout with a single JSON array instead of human-readable text, making both commands easier to consume from scripts and CI. `status --json` emits `{file, doneCount, pendingCount, environments, projects}` per checklist (an empty array `[]` when the checklists directory is missing or no checklists match), and `lift --json` emits `{file, status: 'removed' | 'pending'}` per checklist while keeping the same file-deletion behavior and non-zero exit code when any checklist is still pending.
