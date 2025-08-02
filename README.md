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
createdAt: 2023-10-01
---

- [ ] Update .env files
- [ ] Run DB migration
- [ ] Validate third-party keys
```

## 🛠️ Commands

### `anchor setup`

Interactive setup to create `.anchor/config.json`.

***

### `anchor set [--environment <env>] [--projects <projects>]`

Creates a new checklist. Prompts you to:

* Name the checklist
* Select environments (from config)
* Select projects (from config)
* Enter comma-separated checklist items

**Optional Flags:**

* `--environment <env>`: Filter environments to preselect during prompt
* `--projects <projects>`: Filter projects (comma seperated list) to preselect during prompt

***

### `anchor lift [--environment <env>] [--projects <projects>]`

Marks checklist(s) as lifted (completed). Automatically:

* Validates format
* Checks if all `[ ]` boxes are checked
* Deletes checklist if all complete
* Errors if not

**Optional Flags:**

* `--environment <env>`: Only lift checklists relevant to the environment
* `--projects <projects>`: Filter projects (comma seperated list) to preselect during prompt

***

### `anchor status [--environment <env>]`

Shows the current checklist status for all or specific environments.

**Output example:**

```
📄 pr-456.md — 1 done / 2 pending
📄 hotfix-sso.md — ✅ Complete and removed
```

## 🧪 Validation

Anchor uses strict validation rules for every checklist:

* Valid frontmatter (`environments: [...]`)
* All checklist lines follow `- [ ] ...` or `- [x] ...`

## 🤖 CI / Git Hooks Integration

Use Anchor in your CI pipeline or Git hooks to enforce:

* Checklist existence on PRs
* No incomplete checklists before release
* Fail builds if required environments have unlifted checklists

Example shell check:

```bash
anchor status --environment prod
```

OR

```bash
anchor lift --environment prod --projects api,docs
```

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
