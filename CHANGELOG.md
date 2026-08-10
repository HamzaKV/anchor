# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## 1.1.0

### Minor Changes

- 6eebd76: Add a new `anchor edit` command that interactively toggles which items on an existing checklist are checked, without requiring the whole checklist to be completed (via `lift`) or hand-edited. It prompts for a checklist to edit, then shows a checkbox list of that checklist's items pre-checked to match their current state; the selection becomes the new checked/unchecked state, item order and frontmatter are preserved untouched, and the file is rewritten in place.
- b3d330b: Add a new `anchor validate` command that checks every checklist file under `.anchor/checklists/` for well-formed frontmatter and checklist-line syntax, independent of the completion/pending semantics that `status` and `lift` mix in. It always validates the full set of checklist files and ignores any `--environment`/`--projects` filters, since a malformed checklist is a repo-hygiene bug regardless of environment. Prints a success message and exits 0 when everything is valid, or prints an error per invalid file and exits 1 otherwise.
- 544c583: Add a `--json` flag to `anchor status` and `anchor lift` that fully replaces stdout with a single JSON array instead of human-readable text, making both commands easier to consume from scripts and CI. `status --json` emits `{file, doneCount, pendingCount, environments, projects}` per checklist (an empty array `[]` when the checklists directory is missing or no checklists match), and `lift --json` emits `{file, status: 'removed' | 'pending'}` per checklist while keeping the same file-deletion behavior and non-zero exit code when any checklist is still pending.

### Patch Changes

- 98d5692: Adds `examples/pre-push`, a ready-to-copy Git pre-push hook that runs `anchor lift` and blocks the push if any checklist is still pending, and documents it (plain git and husky install steps) in a new "Git Hooks" subsection of the README.
- eae5190: Adopt Biome as the project's linter and formatter. Adds `npm run lint` (`biome check .`) and `npm run format` (`biome format --write .`), wires `lint` into CI, and documents both commands in CONTRIBUTING.md. Configured to match the existing hand-formatting conventions (4-space indent, single quotes, semicolons); a small number of source files were reformatted or trivially adjusted (e.g. `node:` protocol import, optional catch binding) to satisfy the recommended rule set. No runtime behavior change.
- 4324f30: `anchor setup` no longer silently no-ops when `.anchor/config.json` already exists. It now re-prompts for environments and projects, pre-filling the inputs with the current comma-joined values so you can accept them as-is or edit to add/remove entries, then overwrites `config.json` with the result via the same atomic temp-file-plus-rename write.
- 98f4319: `set`, `status`, and `lift` now discover `.anchor/` by walking up from the current directory to the filesystem root, the same way `git` locates `.git` — so these commands work correctly when run from any subdirectory of a project, not just its root. `setup` is unchanged and continues to create `.anchor/` in the exact current directory, mirroring `git init`.
- 9a97472: Dogfood the release workflow: track a real `.anchor/config.json` and checklists directory in-repo (no longer gitignored) and run the built `anchor status` command as a non-blocking, informational step in the release pipeline after tests.
- df5096d: Add macOS to the CI test matrix so the full test suite runs on ubuntu, windows, and macos across Node 20 and 22.

## 1.0.2

### Patch Changes

- 3ef41ac: Fix several CLI correctness bugs and add missing flags:

  - `--projects`/`-p` didn't strip a leading `=` from `-p=<val>` short-flag syntax the way `-e=<val>` did, so `-p=docs` silently matched the literal (nonexistent) project `"=docs"`.
  - `lift` and `status` detected pending items by checking whether the literal text `[ ]` appeared anywhere in a checklist's content, so a checked item whose own text happened to contain `[ ]` (e.g. `- [x] fix [ ] rendering`) was read as pending forever. Detection is now anchored to the start of a checklist line.
  - `--environment`/`-e` only ever accepted a single value while `--projects`/`-p` already accepted a comma-separated list, so `--environment dev,staging` looked for one literal environment named `"dev,staging"` instead of matching either. `--environment` now comma-splits and matches on overlap, same as `--projects`.
  - `anchor --help`/`-h` and `--version`/`-v` previously fell through to `parseArgs`'s strict-mode error and printed a confusing `❌  Unknown option` instead of doing anything useful. Both flags are now handled explicitly.
  - Extracted the duplicated directory-listing/parse/filter logic shared by `lift` and `status` into `utils/list-checklists.ts`.
  - CI now runs the test matrix against Node 20 and 22 (previously only 20), matching the `engines.node` `>=20` support claim.

## [1.0.1] - 2026-08-09

### Fixed

- `lift` no longer exits early mid-loop on the first pending checklist, skipping checklists that sort after it.
- `--projects` with an empty array (`projects: []`) no longer wrongly excludes checklists that apply to all projects, in both `lift` and `status`.
- Unrecognized CLI flags now print a clean one-line error and exit 1 instead of leaking a raw Node stack trace.
- `validate-checklist` now schema-checks `projects` the same way it checks `environments`, instead of silently mis-filtering on a malformed value.
- `status` now applies the `--projects` filter, matching `lift`.
- `set` retries with a new generated name on filename collision instead of silently overwriting an existing checklist.
- `set`'s `--environment` filter now merges with interactive environment selection instead of one clobbering the other.
- `setup` writes `config.json` via temp file + rename so a crash mid-write can't corrupt it; `set` guards the read-side `JSON.parse` with a clear "re-run anchor setup" error.
- Validation failures in `set`/`setup` now exit 1 instead of exit 0, so CI scripts checking exit codes see the failure.
- Closed a YAML-injection vulnerability where a checklist name/description containing a newline plus `environments: []` could re-parse to silently exempt a checklist from every `--environment` filter, bypassing the release gate. Frontmatter is now serialized with `gray-matter`'s `stringify` instead of hand-built YAML.
- Fixed a crash where an uppercase `[X]` checkbox aborted validation for an entire directory; checkbox parsing now accepts both cases and per-file validation errors are isolated (skip and continue) instead of crashing the whole run.
- `tests/unit/cli-arg-parsing.test.ts` shelled out to `bun`, which no CI runner installs — CI had been red since before this release. Moved it to `tests/e2e` and pointed it at the built `dist/bin/main.js` via plain `node`.

### Changed

- README's CI recipe no longer presents `anchor status` as a gate equivalent to `anchor lift` — only `lift` enforces a non-zero exit. Added a warning against pasting real secret values into checklist items, since they're committed as plain markdown.
- Documented the `-e`/`-p` short flag aliases and added `projects:` to the checklist frontmatter example.
- Added `CONTRIBUTING.md` and `SECURITY.md`.

### Build

- Fixed CI: `npm test` requires a build first (e2e tests spawn the built CLI), and the build script no longer shells out to `bun`-only commands that aren't installed on the CI runner.
- Stopped shipping `tests/` and `vitest.config.js` in the published npm package.
- Committed the test suite, vitest config, and test tooling dependencies — these existed locally but were never committed, so the tagged `1.0.0` release shipped with zero test coverage.
- Added a GitHub Actions CI workflow (previously none existed), now running on both Ubuntu and Windows.
- Added a tag-triggered release workflow that publishes to npm via trusted publishing (OIDC) after typecheck/build/test pass, replacing the manual local `bun run roll` flow.

## [1.0.0]

Initial stable release.
