---
"@varlabs/anchor": patch
---

Fix several CLI correctness bugs and add missing flags:

- `--projects`/`-p` didn't strip a leading `=` from `-p=<val>` short-flag syntax the way `-e=<val>` did, so `-p=docs` silently matched the literal (nonexistent) project `"=docs"`.
- `lift` and `status` detected pending items by checking whether the literal text `[ ]` appeared anywhere in a checklist's content, so a checked item whose own text happened to contain `[ ]` (e.g. `- [x] fix [ ] rendering`) was read as pending forever. Detection is now anchored to the start of a checklist line.
- `--environment`/`-e` only ever accepted a single value while `--projects`/`-p` already accepted a comma-separated list, so `--environment dev,staging` looked for one literal environment named `"dev,staging"` instead of matching either. `--environment` now comma-splits and matches on overlap, same as `--projects`.
- `anchor --help`/`-h` and `--version`/`-v` previously fell through to `parseArgs`'s strict-mode error and printed a confusing `❌  Unknown option` instead of doing anything useful. Both flags are now handled explicitly.
- Extracted the duplicated directory-listing/parse/filter logic shared by `lift` and `status` into `utils/list-checklists.ts`.
- CI now runs the test matrix against Node 20 and 22 (previously only 20), matching the `engines.node` `>=20` support claim.
