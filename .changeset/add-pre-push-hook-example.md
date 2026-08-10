---
"@varlabs/anchor": patch
---

Adds `examples/pre-push`, a ready-to-copy Git pre-push hook that runs `anchor lift` and blocks the push if any checklist is still pending, and documents it (plain git and husky install steps) in a new "Git Hooks" subsection of the README.
