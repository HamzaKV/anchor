# Contributing

## Setup

```sh
npm install
```

## Develop

```sh
npm run dev -- <command>   # run the CLI from source (tsx, no build needed)
```

## Before opening a PR

```sh
npm run typecheck
npm run build
npm test
```

All three must pass. `npm test` runs the full vitest suite (unit, integration, regression, e2e); e2e spawns the built CLI, so `npm run build` must run first — `npm test` alone assumes a fresh `dist/`.

Faster local loop while iterating: `npm run test:fast` (skips e2e) or `npm run test:watch`.

## PRs

- Keep changes scoped — one fix/feature per PR.
- Add or update a test for any behavior change, especially bug fixes (see `tests/regression/` for examples of tests written against a specific bug).
- Update `CHANGELOG.md` under `[Unreleased]`.
