# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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

### Changed
- README's CI recipe no longer presents `anchor status` as a gate equivalent to `anchor lift` — only `lift` enforces a non-zero exit. Added a warning against pasting real secret values into checklist items, since they're committed as plain markdown.

### Build
- Fixed CI: `npm test` requires a build first (e2e tests spawn the built CLI), and the build script no longer shells out to `bun`-only commands that aren't installed on the CI runner.
- Stopped shipping `tests/` and `vitest.config.js` in the published npm package.
- Committed the test suite, vitest config, and test tooling dependencies — these existed locally but were never committed, so the tagged `1.0.0` release shipped with zero test coverage.
- Added a GitHub Actions CI workflow (previously none existed).

## [1.0.0]

Initial stable release.
