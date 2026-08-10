---
"@varlabs/anchor": minor
---

Add a new `anchor validate` command that checks every checklist file under `.anchor/checklists/` for well-formed frontmatter and checklist-line syntax, independent of the completion/pending semantics that `status` and `lift` mix in. It always validates the full set of checklist files and ignores any `--environment`/`--projects` filters, since a malformed checklist is a repo-hygiene bug regardless of environment. Prints a success message and exits 0 when everything is valid, or prints an error per invalid file and exits 1 otherwise.
