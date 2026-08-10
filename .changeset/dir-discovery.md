---
"@varlabs/anchor": patch
---

`set`, `status`, and `lift` now discover `.anchor/` by walking up from the current directory to the filesystem root, the same way `git` locates `.git` — so these commands work correctly when run from any subdirectory of a project, not just its root. `setup` is unchanged and continues to create `.anchor/` in the exact current directory, mirroring `git init`.
