# QA-Gate

A small, reusable quality gate for an npm project. It installs repository-owned Git hooks and runs the same checks in GitHub Actions. The pre-commit hook gives fast feedback; the pre-push hook and CI run the full suite. This repository is a working example and a starting point to copy into another project.

## Use in a project

1. Copy `.githooks/`, `scripts/install-hooks.mjs`, and `.github/workflows/qa.yml` into the project. Add the scripts below to its `package.json`, adapting the check commands to its stack.
2. Run `npm ci`, then `npm run hooks:install`. The installer sets `core.hooksPath` **for this repository only**. It stops if another path is already configured, so existing hooks can be integrated deliberately.
3. Confirm `git config --local --get core.hooksPath` prints `.githooks`. Run `npm run check:fast` and `npm run check` before opening a PR.

```json
{
  "scripts": {
    "hooks:install": "node scripts/install-hooks.mjs",
    "prepare": "npm run hooks:install",
    "check:fast": "npm run typecheck && npm run lint && npm test",
    "check": "npm run check:fast && npm run coverage && npm run build && npm run test:integration && npm audit --audit-level=high"
  }
}
```

Implement `typecheck`, `lint`, `test`, `coverage`, `build`, and `test:integration` with your project's real commands. Remove a step only when it genuinely does not apply. Commit the lockfile and use `npm ci` in CI. The example in this repository uses Node's built-in test runner, syntax checks, and an npm audit, so it needs no third-party packages.

## Gates in this example

| Trigger | Command | Checks |
| --- | --- | --- |
| `git commit` | `npm run check:fast` | Syntax and unit tests |
| `git push` | `npm run check` | Fast gate, integration tests, dependency audit |
| Push or pull request in GitHub | `npm run check` | The same full gate on a clean, locked install |

Run `make qa` for the full gate and `make test-integration` for the focused hook tests. A failing command exits nonzero and blocks the Git operation. Hooks are local safeguards; protect `main` with the required `qa` status check so a contributor without installed hooks cannot merge an unverified change. GitHub repository settings for branch protection must be configured by the owner.

The hook files must retain executable mode (`chmod +x .githooks/pre-commit .githooks/pre-push`). The installer applies it locally as well. Do not bypass hooks to work around a failure; fix the failing check and rerun it.

## Scope

This is a QA workflow template. It contains no application, client mappings, fixtures, or assessment material. Copy and tailor the commands rather than assuming syntax checks alone prove an application is correct.
