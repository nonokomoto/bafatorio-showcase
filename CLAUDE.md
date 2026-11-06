# BafatorioApp — Claude Code Instructions

## Architecture

### Data Flow
```
Component → RTK Query Hook → amplifyBaseQuery → Amplify GraphQL Client → AppSync → DynamoDB
```

### Directory Structure (src/)
- `Components/Pages/` — Route-level components
- `Components/[Feature]/` — Feature modules (Event, Participant, Supplier, Billing)
- `Components/Common/` — Shared components (FeatureGuard, LanguageSwitcher)
- `Api/services/` — RTK Query slices (eventApi, participantApi, supplierApi, etc.)
- `Redux/[Feature]/` — Redux slices for UI state
- `Hook/` — Custom hooks (useEventRole for permissions, useDocumentsCache, etc.)
- `i18n/locales/{locale}/` — Translation JSON files per namespace
- Store: `Api/store.js` with redux-persist (whitelist: user, event, supplier)

### Lambda Functions (amplify/function/)
50+ functions, each with `resource.ts` (defineFunction config) and `handler.ts` (implementation). Shared utilities in `amplify/function/shared/`.

## Code Conventions

### Frontend
- JavaScript (not TypeScript) for frontend; TypeScript for Lambda handlers
- PropTypes required on all components
- Tailwind: use semantic tokens (`bg-primary`, `text-text-100`), never raw colors (`bg-blue-500`)
- Dark mode tokens go 50–950, prefix with `dark:`
- Container padding: `px-8 md:px-10 lg:px-12`
- Always use `shallowEqual` with `useSelector` for objects/arrays
- Never use `refetchOnFocus: true` in RTK Query hooks
- Avoid `transition-all` — use specific properties (`transition-colors`, `transition-[width,transform]`)
- Path aliases: `@/` and `src/` both map to `src/`
- Components in `src/Components/` (PascalCase directories)
- Hooks in `src/Hook/` (camelCase files, `use` prefix)
- API services in `src/Api/services/` (RTK Query slices)
- i18n keys in `src/i18n/locales/{locale}/` (namespace JSON files)

### GraphQL
- **NEVER manually edit** `Graphql/*.ts` — auto-generated from `amplify/data/resource.ts`
- **NEVER run** `npm run amplify:sandbox` — the user manages sandbox lifecycle manually
- GraphQL schema in `amplify/data/resource.ts`
- CDK infrastructure in `amplify/backend.ts`

### Lambda Patterns
- Verification pattern: extract userId from identity → check event ownership or collaborator role → execute
- Lambda-backed mutations for all role-verified operations (ADR-019 pattern)
- Shared utilities in `amplify/function/shared/` (kmsUtils, notionClient)
- Secrets: `npx ampx sandbox secret set <NAME>`
- Use `printf` (not `echo`) when piping secret values to avoid trailing newline
- **Shared functions must create their own `DynamoDBClient` internally** (lazy singleton, see `resolveEventAccess.ts`). Never accept `DynamoDBClient` as a parameter — `shared/` has its own `node_modules/@aws-sdk/client-dynamodb` which causes TypeScript type incompatibility with the handler's copy. Mock shared functions directly in tests (`jest.mock('../shared/myUtil')`), not via the DynamoDB mock.

### DynamoDB
- Owner format: `userId::userId` (Gen 1) vs `userId` (Gen 2) — normalize with `id.split('::')[0]`

### Documents & Storage
- S3 path: `event-documents/{eventId}/{folderId}/{filename}`
- Document preview via `DocumentPreviewModal` — routes by file type to renderers in `documentPreviewRenderers/`
- `useDocumentsCache` hook: filters by S3 path depth (3=root, 4=folder), 5min localStorage cache

### Notion Integration
- OAuth tokens encrypted with KMS, stored in DynamoDB (per-user)
- `notion-to-md` v3 for block-to-Markdown conversion (do NOT upgrade to v4 alpha)
- Max 5 pages per import (AppSync 30s timeout), 3s delay between pages
- Token refresh on 401, auto-delete integration if unrecoverable

## Planning & Design

- Always validate designs against relevant ADRs before implementation
- New ADRs go in `docs/adr/` following the existing numbering (next: ADR-043)

### ADRs by area
Read the relevant ADR(s) before touching code in each area:

| Area                       | ADR(s)                              |
|----------------------------|-------------------------------------|
| Amplify infra / backend    | ADR-001, ADR-003, ADR-004, ADR-020  |
| Frontend / RTK Query       | ADR-005, ADR-012                    |
| Auth / Permissions         | ADR-006, ADR-015, ADR-017, ADR-019  |
| Email                      | ADR-007                             |
| Billing / Stripe           | ADR-008, ADR-034, ADR-036, ADR-038, ADR-042 |
| Akili (chatbot)            | ADR-009                             |
| i18n                       | ADR-010                             |
| Design system / Tailwind   | ADR-011, ADR-025                    |
| DynamoDB / Schema changes  | ADR-013, ADR-020                    |
| Git workflow               | ADR-014                             |
| Suppliers                  | ADR-016, ADR-017, ADR-027           |
| Participants / Roles       | ADR-018, ADR-019                    |
| Documents / S3             | ADR-002, ADR-021, ADR-028           |
| Eliminação de conta / RGPD | ADR-035, ADR-040                    |
| Dev overlay / beta gating  | ADR-022                             |
| Notion integration         | ADR-023                             |
| Fidelize integration       | ADR-024                             |
| Event tools migration      | ADR-026                             |
| Schedule / Calendar        | ADR-029, ADR-030                    |
| Amplify schema evolution   | ADR-031                             |
| CI / Quality gates         | ADR-032                             |

## Workflow

Mandatory steps for every task in this repo. Skipping steps is not optional.

### Before writing any code
- **Zoom out first:** run `/zoom-out` to map the relevant modules, callers, and dependencies — never start coding without context
- **Consult ADRs:** read the relevant ADRs in `docs/adr/` (key ones: ADR-019 roles/access, ADR-021 documents/folders). If a decision is architectural, propose a new ADR before coding
- **Clarify ambiguity:** if requirements are unclear, run `/grill-me` to resolve decision branches before writing anything
- **Read framework docs:** before using any framework primitive (RTK Query, Framer Motion, react-i18next, hooks with persistent state), consult current docs via context7 or fetch — training data is unreliable

### During implementation
- **TDD for backend:** when touching Lambdas, AppSync resolvers, or any backend logic, follow red-green-refactor — write the failing test first, then minimal code to pass
- **Lambda verification pattern:** every role-verified Lambda must extract userId → check ownership or collaborator role → execute (ADR-019)
- **No scope creep:** solve exactly what was asked; don't refactor adjacent code unless required

### Before declaring done
- **`simplify`:** review the changed code for reuse, clarity, and dead code — fix what's found
- **Lint + tests pass:** `npm run lint` (zero warnings) and `npm test` must be green
- **UI verification:** for frontend changes, test in the browser — golden path + edge cases. Type-check does not validate UX
- **`security-review`:** when touching auth, KMS, permissions, role checks, or Lambda handlers
- **Multi-issue implementations:** call `advisor()` before each commit — one advisor call per issue, before committing

### After completing
- **`/to-issues`:** if work was scoped down or follow-ups remain, convert them to GitHub issues so nothing is lost

### Never
- Manually edit `Graphql/*.ts` — auto-generated
- Run `npm run amplify:sandbox` — the user manages sandbox lifecycle
- `git push` to `main`/`master` without asking
- **Sign commits or PRs with your name.** Never add `Co-Authored-By: Claude …` trailers to commit messages, never sign PR descriptions, never include "🤖 Generated with Claude Code" or similar. Author and co-authors must be Ney only. This applies to every commit, every PR body, every squash-merge message — no exceptions, even if the global Claude Code defaults suggest otherwise.

 