# Bafatório

Event management platform for people who organise weddings, conferences and corporate events: guest lists, RSVPs, suppliers and quotes, schedules, documents and team roles in one place. It runs in production at [bafatorio.com](https://bafatorio.com).

This repository is a public snapshot of the application code. Production identifiers, customer data and internal planning documents were removed, and the git history is not included.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Redux Toolkit + RTK Query, Tailwind CSS, Framer Motion, i18next (PT, EN, FR) |
| API | AWS AppSync (GraphQL), defined in TypeScript with Amplify Gen 2 |
| Compute | 69 AWS Lambda functions in TypeScript |
| Data | Amazon DynamoDB |
| Auth | Amazon Cognito, with per-event roles (owner, co-manager, staff) checked in Lambda |
| Files | Amazon S3, with per-event folders and in-app preview |
| Email | Amazon SES behind an SQS queue |
| Secrets | AWS KMS for third-party OAuth tokens (Notion, Fidelize) |
| Payments | Stripe: free plan, pay-per-event by participant tier, and a Pro subscription |
| Quality | Jest (125 test files), ESLint with zero warnings, React Doctor score in CI, Sentry |

## Architecture

```
React (Vite) ── RTK Query ── Amplify client ── AppSync (GraphQL)
                                                  │
                     ┌────────────────────────────┼─────────────────────┐
                     │                            │                     │
               DynamoDB tables            Lambda resolvers         Cognito
                                     (role check → action)
                                                  │
                     ┌──────────┬─────────────────┼──────────┐
                     S3        SQS → SES        Stripe      KMS
```

Every operation that depends on a user's role in an event goes through a Lambda that reads the caller's identity, checks ownership or collaborator role, and only then writes. The pattern is documented in [ADR-019](docs/adr/ADR-019-event-scoped-roles.md).

## Decisions

The [`docs/adr/`](docs/adr) folder has 42 architecture decision records, written in Portuguese. Good starting points:

- [ADR-004](docs/adr/ADR-004-amplify-backend-complete-architecture.md): backend architecture
- [ADR-008](docs/adr/ADR-008-stripe-billing-architecture.md) and [ADR-038](docs/adr/ADR-038-pay-per-event-participant-tiers.md): billing
- [ADR-020](docs/adr/ADR-020-safe-deploy-schema-changes.md) and [ADR-031](docs/adr/ADR-031-amplify-gen2-schema-evolution-safety.md): changing a live DynamoDB schema without downtime
- [ADR-028](docs/adr/ADR-028-s3-event-documents-threat-model.md): threat model for event documents
- [ADR-035](docs/adr/ADR-035-event-cascade-deletion.md) and [ADR-040](docs/adr/ADR-040-financial-records-on-account-deletion.md): account deletion under GDPR

## Project layout

```
amplify/
  backend.ts          CDK wiring for all AWS resources
  data/resource.ts    GraphQL schema and authorization rules
  function/           Lambda handlers, one folder each, with tests
src/
  Api/services/       RTK Query slices
  Components/         Feature modules (Event, Participant, Supplier, Billing…)
  Hook/               Custom hooks, e.g. useEventRole for permissions
  i18n/locales/       Translations
sites/hello-bafatorio Marketing landing page
docs/adr/             Architecture decision records
```

## Running it

You need Node 22 and an AWS account.

```bash
npm install
npx ampx sandbox      # deploys a personal backend to your AWS account
npm run dev           # starts the frontend on http://localhost:5173
npm test
npm run lint
```

The sandbox expects secrets for Stripe and the integrations (`npx ampx sandbox secret set <NAME>`). Without them the related features stay off.

## Author

Ney Carvalho. Built with AI coding agents (Claude Code) under my direction: I own the architecture, the decisions in the ADRs and the review of every change. [`CLAUDE.md`](CLAUDE.md) holds the rules the agents follow.

The code is shared to show how the product is built. All rights reserved.
