# ADR-032 — React Doctor CI Quality Gate: Ratchet on New Issues, Not Whole-Repo Score

## Status

Accepted — 2026-07-10

## Context

The CI workflow (`.github/workflows/ci.yml`, added in `8cefc0a`) included a **React Doctor** job that ran `npx react-doctor@latest . --score` over the whole repository and failed the build when the score was below **75/100**.

The codebase scores **40/100**. Because the threshold was set aspirationally above the current baseline, the job **blocked every pull request since it was introduced**, regardless of what the PR changed. Lint, Build and Test passed on our launch-prep PRs (#143–#146); only React Doctor failed. This is the concrete reason "nothing passed CI".

Investigation (during the launch cleanup sprint) established:

- **The score is driven by breadth, not by unused files.** The 40 comes from ~1300 warnings spread across Maintainability (584), Bugs (296 + 6 errors), Performance (270 + 2 errors) and Accessibility (165). Deleting dead files barely moves it — even scoped to `src/` the score stays at 40.
- **`unused-file` has a large false-positive class.** Of 158 `unused-file` findings, **122 are under `amplify/`** — Lambda handlers and `resource.ts` files that are deployed via `defineFunction` and wired in `amplify/backend.ts` / `amplify/data/resource.ts`. React Doctor is a React/frontend analyzer and does not follow that wiring, so it reports live backend code as unused. Verified: `accept-invitation` (flagged unused) is imported in both `backend.ts` and `resource.ts`.
- **`react-doctor@latest` is unpinned.** The gate result can change without any code change when a new tool version ships rules — a flaky, non-reproducible gate.

Reaching 75 would require a broad, multi-category cleanup that React Doctor itself warns against doing in one sweep ("sample before you sweep"), and is not realistic before the 22 Jul 2026 market-fit launch. But simply lowering or removing the gate throws away the value of catching *new* regressions.

## Decision

**Gate on issues a PR introduces, not on the whole-repo score.** Legacy debt is paid down incrementally; the gate stops new debt.

### Blocking job — `React Doctor`

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0                     # base history needed for --scope changed
# ...
- name: React Doctor — new issues vs base
  env:
    BASE_REF: ${{ github.base_ref }} # via env, not inlined in run: (injection-safe)
  run: |
    git fetch origin "$BASE_REF" --depth=1
    npx react-doctor@0.7.4 . \
      --scope changed \
      --base "origin/$BASE_REF" \
      --blocking error \
      --no-score
```

- `--scope changed --base origin/<base>` reports only diagnostics **new relative to the PR's base branch**. A PR fails only if it *adds* problems.
- `--blocking error` — only error-severity regressions fail CI (chosen for the launch sprint; tighten to `warning` post-launch, see below).
- **Pin `react-doctor@0.7.4`** — reproducible gate, decoupled from upstream releases.
- `github.base_ref` is passed through `env:`, not interpolated into `run:` — GitHub Actions script-injection best practice.
- The check keeps the name **`React Doctor`** so existing branch-protection rules continue to match.

### Advisory job — `React Doctor Score`

A second job runs `react-doctor@0.7.4 . --score` over the whole repo, writes the number to the run summary, and is marked `continue-on-error: true`. It **never blocks a PR** — it exists so the whole-repo health score stays visible and can be ratcheted up over time.

### Known limitation — do not delete `amplify/` "unused" files

The whole-repo scan reports `amplify/` Lambda files as unused (false positives). They must not be deleted. Cleanup of `unused-file` findings applies to `src/` only, and even there each file is verified individually before removal (see #147).

## Consequences

### Positive

- PRs are no longer blocked by pre-existing debt — the launch sprint (and the team) is unblocked.
- Quality ratchets **up**: new error-severity issues cannot be merged, so the codebase can only get healthier per PR.
- The gate is reproducible (pinned version) and fair (judged on the diff, not the repo's history).
- Whole-repo health remains visible via the advisory job.

### Negative

- Legacy debt is not gated — the 40 baseline persists until cleaned up incrementally.
- Under `--blocking error`, a PR that adds only **new warnings** still passes; warning-level debt can still accumulate until we tighten the level.
- Losing the score gate means no single number enforces overall health; it relies on discipline + incremental cleanup.

### Neutral

- **Post-launch:** raise `--blocking` from `error` to `warning` so new code cannot add warnings either.
- **Incremental cleanup** (dead code, barrel imports, missing button types) is tracked separately and lifts the advisory score over time.
- If React Doctor is upgraded, bump the pinned version deliberately in one PR and review any new findings the diff scope surfaces.
- **Supply-chain (Socket.dev):** o check exclui devDependencies (`doctor.config.json`, `supplyChain.includeDevDependencies: false`, 2026-07-14). Motivo: o score do Socket é externo e flutua — `aws-cdk-lib` (CDK oficial da AWS, devDependency de build) caiu abaixo do mínimo 50 no eixo install-time e bloqueou o PR #161 sem regressão real; o react-doctor v0.7.x não suporta exceção por pacote. O gate mantém rigor total nas dependencies de produção (o que corre no cliente e nas Lambdas).

## References

- CI workflow: `.github/workflows/ci.yml`
- PR #148 — CI: React Doctor gates on new issues, not whole-repo score
- PR #147 — cleanup: remove dead frontend files (Akili + 12 unused)
- Issue #142 — Launch v1.0 scope
- React Doctor: https://react.doctor/docs (`--scope`, `--base`, `--blocking` flags)
