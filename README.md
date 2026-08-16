# @varlabs/anchor

**Anchor** is a lightweight CLI tool to enforce and validate release checklists in development workflows. Inspired by `changesets`, Anchor ensures all non-code changes—especially environment-specific configurations—are explicitly reviewed before release.

[Documentation](https://varlabs.gitbook.io/varlabs-docs/)

```
npm i @varlabs/anchor
```

```
yarn add @varlabs/anchor
```

```
pnpm add @varlabs/anchor
```

```
bun add @varlabs/anchor
```

## 📦 Features

* ✅ Checklist generation for pull requests/releases
* 🧾 Markdown-based checklists with frontmatter metadata
* 📁 All config and state stored in `.anchor/`
* 📌 Enforces checklist presence and completion before release
* 🧠 Human-readable checklist names
* 🧪 Built-in validation of checklist structure
* 🛠️ Fully interactive CLI prompts
* 🏗️ Works seamlessly with Git Hooks and CI pipelines

## ⚙️ Setup

Run this command once in your project to initialize Anchor:

```bash
anchor setup
```

You will be prompted to enter a comma-separated list of environments (e.g., `dev, staging, prod`) and (optionally) a comma-separated list of project - for monorepos. This creates:

```
.anchor/
├── config.json        # Contains 
└── checklists/        # Stores markdown
```

## 🧾 Checklist Format

Each checklist is a Markdown file with frontmatter like:

```md
---
name: PR #456
description: "Add SSO support"
environments: [dev, staging]
projects: [api, web]
createdAt: 2023-10-01
---

- [ ] Update .env files
- [ ] Run DB migration
- [ ] Validate third-party keys
```

> ⚠️ Checklists are stored as plain, usually-committed markdown files.
> Never paste real secret values (API keys, tokens, passwords) into a
> checklist item — reference where the secret lives instead (e.g. "set
> STRIPE_KEY in the prod secrets manager"), not the value itself.

## 🛠️ Commands

Run `anchor <command> --help` for a command's flags at any time.

### `anchor setup`

Interactive setup to create `.anchor/config.json`.

***

### `anchor set [--environment <env>] [--projects <projects>] [--name <name> --items <items>] [--description <text>]`

Creates a new checklist. Prompts you to:

* Name the checklist
* Select environments (from config)
* Select projects (from config)
* Enter comma-separated checklist items

**Optional Flags:**

* `--environment <env>` / `-e <env>`: Filter environments to preselect during prompt (or, combined with `--name`/`--items` below, the environments applied directly)
* `--projects <projects>` / `-p <projects>`: Filter projects (comma seperated list) to preselect during prompt (or applied directly, see below)
* `--name <name>` and `--items <items>`: Skip the interactive prompt entirely and create the checklist non-interactively — useful for scripting checklist creation in CI. Both flags are required together, and `--environment` is also required in this mode (unlike the interactive prompt, there's no way to explicitly confirm an intentionally empty environment list, so a missing `--environment` is treated as a forgotten flag, not an empty selection). `--projects`/`--description <text>` stay optional.

```bash
anchor set --name pr-456 --items "Update .env,Run DB migration" --environment prod --projects api
```

***

### `anchor lift [--environment <env>] [--projects <projects>] [--json] [--dry-run]`

Marks checklist(s) as lifted (completed). Automatically:

* Validates format
* Checks if all `[ ]` boxes are checked
* Deletes checklist if all complete
* Errors if not

**Optional Flags:**

* `--environment <env>` / `-e <env>`: Only lift checklists relevant to the environment
* `--projects <projects>` / `-p <projects>`: Filter projects (comma seperated list) to preselect during prompt
* `--json`: Print a single JSON array instead of human-readable text (see below). File deletion behavior and exit codes are unchanged.
* `--dry-run`: Preview which checklists would be removed without deleting anything. The pending-checklist exit code (`1`) still applies, so it's safe to use in CI to check what a real `lift` would do.

***

### `anchor rm <name>`

Deletes a checklist by filename (with or without the `.md` extension), regardless of whether its items are complete. Unlike `anchor lift`, this doesn't require the checklist to be finished first — use it to discard a checklist you no longer need.

```bash
anchor rm pr-456
```

***

### `anchor edit`

Interactively toggle which items on an existing checklist are checked. Prompts you to:

* Pick a checklist from `.anchor/checklists/`
* Select the items that should be checked (currently-checked items start pre-selected) — unchecking an item you previously checked marks it pending again

Frontmatter and item order are preserved untouched; only the `[ ]` / `[x]` state of each line changes.

> `anchor edit` toggles item state only — it doesn't remove individual items or delete
> the file. To remove a whole checklist, delete it once every item is complete with
> `anchor lift`, or delete it directly (finished or not) with `anchor rm <name>`.

***

### `anchor status [--environment <env>] [--projects <projects>] [--json]`

Shows the current checklist status for all or specific environments/projects.

**Optional Flags:**

* `--environment <env>` / `-e <env>`: Only show checklists relevant to the environment
* `--projects <projects>` / `-p <projects>`: Filter projects (comma seperated list)
* `--json`: Print a single JSON array instead of human-readable text (see below)

**Output example:**

```
📄 pr-456.md — 1 done / 2 pending
📄 hotfix-sso.md — ✅ Complete and removed
```

**`--json` output:**

`anchor status --json` fully replaces stdout with a single JSON array, one object per checklist:

```json
[
  { "file": "pr-456.md", "doneCount": 1, "pendingCount": 2, "environments": ["dev"], "projects": ["api"] }
]
```

If the `.anchor/checklists` directory doesn't exist, or no checklists match, `anchor status --json` prints `[]`.

`anchor lift --json` fully replaces stdout with a single JSON array, one object per checklist, reporting whether it was removed or is still pending:

```json
[
  { "file": "pr-456.md", "status": "pending" },
  { "file": "hotfix-sso.md", "status": "removed" }
]
```

`anchor lift` still exits with code `1` if any checklist is still pending, regardless of `--json`.

***

### `anchor validate`

Checks that `.anchor/config.json` (if present) and every checklist file
under `.anchor/checklists/` are well-formed — valid frontmatter and
correctly formatted checklist lines. Unlike `status` and `lift`, this
always checks **every** checklist file, ignoring any `--environment`/
`--projects` filters: a malformed checklist or config is a repo-hygiene bug
regardless of environment.

**Output example:**

```
❌  Invalid checklist hotfix-sso.md: Invalid frontmatter: 'environments' must be an array in .anchor/checklists/hotfix-sso.md
```

or, when everything is well-formed:

```
✅  All checklists valid
```

Exits non-zero if any checklist is invalid — use it in CI to catch malformed
checklists before they reach `status` or `lift`.

***

## 🧪 Validation

Anchor uses strict validation rules for every checklist:

* Valid frontmatter (`environments: [...]`)
* All checklist lines follow `- [ ] ...` or `- [x] ...`

## 🤖 CI / Git Hooks Integration

Use Anchor in your CI pipeline or Git hooks to enforce:

* Checklist existence on PRs
* No incomplete checklists before release
* Fail builds if required environments have unlifted checklists

`anchor status` is informational only — it never fails the build, even
when checklists are pending. To actually gate a release, use `anchor lift`,
which exits non-zero when any matching checklist still has unchecked items:

```bash
anchor lift --environment prod --projects api,docs
```

### Git Hooks

A ready-to-use `pre-push` hook is included at [`examples/pre-push`](./examples/pre-push). It
runs `anchor lift` and blocks the push if any checklist is still pending.

**Plain git:**

```bash
cp examples/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

**husky:**

Copy the same `anchor lift` line into `.husky/pre-push`.

## 🔧 Config File Example

`.anchor/config.json`

```json
{
  "environments": ["dev", "staging", "prod"],
  "projects": ["api", "docs", "web", "mobile"]
}
```

## 🧑‍💻 License

MIT — Made with ❤️ by devs who hate broken production environments.
