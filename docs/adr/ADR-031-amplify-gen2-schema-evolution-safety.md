# ADR-031 — Amplify Gen 2 Schema Evolution Safety: Sandbox vs Branch Deployments

## Status

Accepted — 2026-05-12

## Context

Empirical evidence accumulated during work on PR #126 (`role_manager`) showed that GSI changes on the `Participant` model destroyed all data in a developer's local sandbox **twice in a row** — once when a `.secondaryIndexes()` declaration was added, and again when it was removed. The same operations applied to the `development` and `main` branch tables left data intact.

This contradicted the widespread assumption — including in our own `docs/plans/2026-05-07-gsi-elimination-strategy.md` — that GSI changes are uniformly destructive under Amplify Gen 2 (issue #3025). The premise was used to justify removing a `.secondaryIndexes()` declaration and replacing the resulting `QueryCommand`-based Lambda paths with `ScanCommand`. The cost was significant: O(N) RCU instead of O(1), a new `performanceMetrics` module to monitor the degradation, and a `DAX` discussion as future mitigation.

Before merging more schema-changing PRs we need a written, primary-source decision on when schema changes are safe and when they are not.

## Decision

Adopt the following matrix as the project's source of truth for schema-evolution risk, grounded in the configuration set by `@aws-amplify/backend-data` and consumed by the `Custom::AmplifyDynamoDBTable` custom resource.

### Configuration source (verified in `node_modules`)

`@aws-amplify/backend-data/lib/factory.js` always passes:

```js
translationBehavior: {
  // "The destructive updates should be always allowed in backend definition
  //  and not to be controlled on the IaC. The CI/CD check should take the
  //  responsibility to validate if any tables are being replaced and
  //  determine whether to execute the changeset"
  allowDestructiveGraphqlSchemaUpdates: true,
  ...
}
```

And only for sandbox deployments adds:

```js
if (isSandboxDeployment) {
  Aspects.of(amplifyApi).add(new ReplaceTableUponGsiUpdateOverrideAspect());
}
```

The handler at `@aws-amplify/graphql-model-transformer/.../amplify-table-manager-handler.js` branches on these two flags:

```js
if (tableDef.replaceTableUponGsiUpdate && tableDef.allowDestructiveGraphqlSchemaUpdates) {
  // DROP + CREATE (data loss)
} else {
  // getNextAtomicUpdate() — in-place, sequential
}
```

### Risk matrix

| Operation | Sandbox (`ampx sandbox`) | Branch deployment (`development`, `main`) |
|---|---|---|
| Add a field (`a.string()`, `a.boolean()`, …) | Safe — DynamoDB is schemaless | Safe |
| Add `a.hasMany('Child', 'fk')` or `a.belongsTo('Parent', 'fk')` | **DROP+CREATE** — creates an implicit `gsi-<Parent>.<field>` | Safe — in-place GSI add |
| Add explicit `.secondaryIndexes(...)` | **DROP+CREATE** | Safe — in-place GSI add |
| Remove explicit `.secondaryIndexes(...)` | **DROP+CREATE** | Safe — in-place GSI remove |
| Change `.identifier(...)` (partition/sort key) | **DROP+CREATE** | **DROP+CREATE** |
| Change `BillingMode`, `StreamSpecification`, TTL, PITR | Safe | Safe |

### Operational rules

1. **Sandboxes are ephemeral.** Treat the data inside a sandbox as throwaway. Any PR that adds, removes, or modifies a `hasMany`/`belongsTo`/`.secondaryIndexes()` will drop the affected tables on the next `ampx sandbox` run. Seed scripts and feature work must tolerate this.

2. **Branch deployments preserve data across GSI changes.** Do not justify performance-degrading workarounds (Scan instead of Query) with the sandbox replacement behavior. GSIs declared in the schema or generated implicitly by relationships are safe to add and remove on `development` and `main`.

3. **Key schema changes are destructive everywhere.** Changing `.identifier(...)` on an existing model — including the rare case of switching the partition key field — will drop the table in any environment. Such changes require a planned migration (backup → new model → backfill → cutover), not a direct schema edit.

4. **Implicit GSIs are real.** A `hasMany('Child', 'fk')` on a parent model creates `gsi-<Parent>.<field>` on the child table. This GSI is queryable from Lambda code via `IndexName: 'gsi-<Parent>.<field>'` and should be used in preference to `ScanCommand` for filtered lookups on the foreign key.

5. **CI/CD is the production safety net.** The `allowDestructiveGraphqlSchemaUpdates: true` setting trusts CI/CD to catch table replacements via CloudFormation change-set inspection before deploy. Until that check exists in the pipeline, every schema-changing PR requires the pre-merge checklist below.

### Pre-merge checklist for schema-changing PRs

Required when a PR modifies `amplify/data/resource.ts` in ways that affect any model already deployed:

- [ ] Backup the affected tables in `development` immediately before merging:
  `aws dynamodb create-backup --table-name <Table>-xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE --backup-name pre-pr<N>-merge-$(date +%Y%m%d)`
- [ ] Confirm PITR is enabled on the production table:
  `aws dynamodb describe-continuous-backups --table-name <Table>-xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE`
- [ ] Watch CloudFormation events on the `amplify-dEXAMPLEAPPID-development-…` stack during deploy. If the affected table's `CreationDateTime` updates to the deploy window, the table was replaced — stop the pipeline and investigate before promoting to `main`.
- [ ] If the PR removes a relationship or `.secondaryIndexes()`, verify no Lambda handler still references the now-deleted GSI by name (`IndexName: 'gsi-…' ` or the custom index name).

### Escape hatches

- **Local iteration against shared data.** Point the local app at the `development` API instead of running a sandbox: `npx ampx generate outputs --branch development`. No table replacement, no data loss, slightly slower feedback loop.
- **Suppress GSI replacement in sandbox.** The `ReplaceTableUponGsiUpdateOverrideAspect` can be removed via a CDK aspect override in `amplify/backend.ts`. Use with care — it diverges sandbox behavior from production behavior, which defeats the purpose of having a sandbox.

## Consequences

### Positive

- Future PRs can declare `.secondaryIndexes()` and `hasMany` relationships with confidence about what will happen in each environment.
- Performance-degrading workarounds (Scan vs Query) can be reverted where they were adopted under the now-disproven "GSI = always destructive" premise.
- Onboarding documentation has a single source of truth for schema-change risk.

### Negative

- Sandboxes remain unsuitable for testing against persistent datasets when iterating on relationships. Developers who need that must use the `--branch development` escape hatch.
- The production safety net depends on a CI/CD change-set check that is not yet implemented. Until then, the pre-merge checklist must be followed manually.

### Neutral

- This ADR documents Amplify Gen 2 behavior as of `@aws-amplify/backend@^1.21.1`. AWS may change the defaults in future versions — re-verify the citations in `factory.js` and `amplify-table-manager-handler.js` if the package is upgraded across a major version.

## References

- `node_modules/@aws-amplify/backend-data/lib/factory.js` — sets `allowDestructiveGraphqlSchemaUpdates: true` and the sandbox-only `ReplaceTableUponGsiUpdateOverrideAspect`
- `node_modules/@aws-amplify/data-construct/node_modules/@aws-amplify/graphql-model-transformer/lib/resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler.js` — the branching logic between in-place atomic updates and table replacement
- [ADR-019](./ADR-019-event-roles-collaborator-access.md) — role and collaborator access pattern (referenced by Lambdas that consume the GSIs in question)
- [ADR-021](./ADR-021-document-folder-lambda-crud.md) — Lambda-backed CRUD pattern
- Empirical incident: PR #126 `role_manager`, two sandbox data losses on 2026-05-07 and 2026-05-12
- `docs/plans/2026-05-07-gsi-elimination-strategy.md` — superseded by this ADR; its premise that GSI changes are always destructive applies only to sandbox
