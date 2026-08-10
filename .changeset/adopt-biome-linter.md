---
"@varlabs/anchor": patch
---

Adopt Biome as the project's linter and formatter. Adds `npm run lint` (`biome check .`) and `npm run format` (`biome format --write .`), wires `lint` into CI, and documents both commands in CONTRIBUTING.md. Configured to match the existing hand-formatting conventions (4-space indent, single quotes, semicolons); a small number of source files were reformatted or trivially adjusted (e.g. `node:` protocol import, optional catch binding) to satisfy the recommended rule set. No runtime behavior change.
