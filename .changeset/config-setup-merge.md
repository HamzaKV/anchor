---
"@varlabs/anchor": patch
---

`anchor setup` no longer silently no-ops when `.anchor/config.json` already exists. It now re-prompts for environments and projects, pre-filling the inputs with the current comma-joined values so you can accept them as-is or edit to add/remove entries, then overwrites `config.json` with the result via the same atomic temp-file-plus-rename write.
