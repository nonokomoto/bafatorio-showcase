# ADR-033 — Sentry Frontend Monitoring: Baseline (Errors + Tracing) with Env-Gated SDK and Build-Time Source Maps

## Status

Accepted — 2026-07-11

## Context

The frontend had no error monitoring. Runtime failures in production were invisible: the app relied on `console.error`, which nobody watches. This surfaced concretely while hardening the Stripe billing flow — `planConfig.js` had a fail-fast guard for missing `VITE_STRIPE_PRICE_*` env vars whose production branch could only `console.error`, a signal that never reaches us. We needed real observability before shipping billing.

Constraints and facts established during setup:

- **Stack:** React 18.3 + Vite 6, `react-router-dom` v6.25 (component `<BrowserRouter>` + `<Routes>`, not a data router), Redux Toolkit. Frontend is JavaScript (not TS).
- **Hosting:** AWS Amplify Hosting (app `dEXAMPLEAPPID`, branches `main` + `development`). Backend is Amplify Gen 2.
- **SDK:** `@sentry/react` v10. Note the v10 router API rename — `withSentryReactRouterV6Routing` / `reactRouterV6BrowserTracingIntegration` are **deprecated** in favour of the version-agnostic `wrapReactRouterRouting` / `reactRouterBrowserTracingIntegration`.
- **Sentry project:** `bafatorio-ho/bafatorio-app` (org `bafatorio-ho`). A duplicate `javascript-react` project (created by the web onboarding wizard) was deleted to avoid split events.

## Decision

**Instrument the frontend with a Sentry baseline — error monitoring + tracing — gated entirely on environment variables, plus build-time source map upload.** Session Replay, Logging, and Profiling were deliberately deferred (not needed yet; more data/cost).

### SDK init — `src/instrument.js` (sidecar, imported first in `main.jsx`)

- `Sentry.init` runs before any app code (first import in `main.jsx`), per Sentry's requirement.
- **Gated on `import.meta.env.VITE_SENTRY_DSN`.** With no DSN the SDK never initializes and every `Sentry.*` call is a safe no-op. This keeps dev/CI/local builds without a DSN clean.
- Tracing via `reactRouterBrowserTracingIntegration` (page-load + navigation spans named by route pattern, e.g. `/app/event/:id`).
- `tracesSampleRate`: `1.0` in dev, `0.2` in production.

### Wiring into existing components (no duplication)

- **`App.jsx`** — `<Routes>` wrapped with `Sentry.wrapReactRouterRouting` so navigation spans carry the route pattern, not the raw URL.
- **`ErrorBoundary.jsx`** — the existing custom boundary now calls `Sentry.captureException` in `componentDidCatch`, **except** chunk-load errors (those self-heal via the existing reload path).
- **`store.js`** — `Sentry.createReduxEnhancer()` attaches Redux actions/state to each event's context.
- **`planConfig.js`** — the Stripe price-id fail-fast, in production, now calls `Sentry.captureMessage(..., { level: 'error', extra: { missingPriceIds } })` instead of `console.error`. Dev still throws (visible immediately).

### Source maps — `vite.config.js` + `package.json`

- `@sentry/vite-plugin` uploads source maps at build time so production stack traces are readable.
- **Both the plugin and `build.sourcemap: 'hidden'` are gated on `SENTRY_AUTH_TOKEN`.** No token → no maps generated, no upload, no OOM. With a token → generate hidden maps, upload, then delete `.map` from `dist` (`filesToDeleteAfterUpload`) so they are never served publicly.
- The token is read via `loadEnv(mode, cwd, '')` (empty prefix loads non-`VITE_` vars into the Node build context only — it never reaches the client bundle).
- **`build` script pins `NODE_OPTIONS=--max-old-space-size=4096`.** Source-map processing over this app's large chunks (EventDetails ~2.3 MB, main ~2.6 MB) OOMs the default Node heap (~2 GB). Measured requirement is ~2.3 GB (build passes at 2304 MB, OOMs at the 2096 MB default); 4096 gives headroom for bundle growth without starving the host (dev machine has 8 GB; Amplify uses default build compute, `jobConfig: null`). This memory is consumed only during `vite build` — not the dev server, and there is no Node process in production (the frontend ships as static files).

### Environment variables

| Var | Where | Secret? | Purpose |
|-----|-------|---------|---------|
| `VITE_SENTRY_DSN` | `.env` + Amplify app-level | No (public, ships in client bundle) | Enables the client SDK |
| `SENTRY_AUTH_TOKEN` | `.env` + Amplify app-level | Yes (org auth token) | Build-time source map upload only |

- `.env` is gitignored; `.env.example` (now tracked via a `!.env.example` exception in `.gitignore`) documents both, with `SENTRY_AUTH_TOKEN` explicitly **without** a `VITE_` prefix.
- On Amplify, both are set at **app level** — they merge into every branch build; the per-branch overrides only replace the specific keys they name, and neither branch overrides these two.

## Consequences

### Positive

- Real error + navigation-trace visibility in production, verified end-to-end (test error → envelope POST 200 → issue in `bafatorio-app`).
- Zero-config safety: no DSN → SDK off; no token → no source maps. Local/CI builds don't need either.
- The billing misconfiguration that started this (missing price IDs) is now a Sentry event in prod, not a lost log.

### Negative / trade-offs

- **`SENTRY_AUTH_TOKEN` lives in an Amplify env var, which AWS docs advise against for secrets** (they recommend Amplify Secret management). Rationale: Gen 2 Secret management feeds **backend Lambdas**, not the frontend `vite build` process, which reads `process.env.SENTRY_AUTH_TOKEN`. The token is an org auth token scoped to source-map upload and is revocable — low blast radius. **Rotate periodically.**
- Production builds need ~2.3 GB of build memory (measured); the script pins a 4 GB Node heap ceiling for headroom. Consumed only during `vite build`, on whichever machine runs it (locally or Amplify's build server).
- One Sentry project serves all environments; events are separated by `environment` (`import.meta.env.MODE`), not by project. Split later if needed.

### Deferred (not done here)

- Session Replay, Logging, Profiling.
- Release tracking / `release` tagging in `Sentry.init` (pairs naturally with source maps).

## References

- Official setup followed: `skills.sentry.dev/instrument` (React SDK) and `docs.sentry.io` React guide; validated via context7 (`getsentry/sentry-docs`).
- Related: the Stripe price-id env migration and fail-fast guard (same work session) — see `planConfig.js` and `PlanSelection.jsx`.
