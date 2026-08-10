---
"@varlabs/anchor": patch
---

Dogfood the release workflow: track a real `.anchor/config.json` and checklists directory in-repo (no longer gitignored) and run the built `anchor status` command as a non-blocking, informational step in the release pipeline after tests.
