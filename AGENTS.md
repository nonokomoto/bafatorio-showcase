# AGENTS.md

Instructions for AI coding agents working in Bafatório.

## Base project instructions

- Read and follow [`CLAUDE.md`](CLAUDE.md) before planning or changing code in this repository.
- Consult the ADRs in `docs/adr/` before architectural or deployment-sensitive changes.
- Follow the repository workflow: explore → decide → change → verify.
- Keep all user-facing strings synchronized across `pt-PT`, `en-US` and `fr-FR`.
- Never manually edit generated files under `Graphql/`.
- Never execute `npx ampx sandbox` as an agent; prepare the changes and let the user start or delete sandboxes.

## Project-specific instructions

- When work touches `sites/hello-bafatorio/`, read and follow [`sites/hello-bafatorio/AGENTS.md`](sites/hello-bafatorio/AGENTS.md) before planning or changing anything.
- The local landing instructions extend this file and take precedence when they are more specific.
