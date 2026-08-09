# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
