---
"@varlabs/anchor": minor
---

Add a new `anchor edit` command that interactively toggles which items on an existing checklist are checked, without requiring the whole checklist to be completed (via `lift`) or hand-edited. It prompts for a checklist to edit, then shows a checkbox list of that checklist's items pre-checked to match their current state; the selection becomes the new checked/unchecked state, item order and frontmatter are preserved untouched, and the file is rewritten in place.
