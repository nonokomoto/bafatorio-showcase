# ADR-035 — Event Cascade Deletion

## Status

Accepted — 2026-07-14

## Context

O delete de um evento no Bafatorio está atualmente repartido entre o frontend (`EventDelete.jsx`) e a Lambda de GDPR (`delete-user-data`). Nenhum dos dois lados cobre todas as relações do evento, o que deixa registos órfãos no DynamoDB e objetos órfãos no S3.

### Fluxo atual (`EventDelete.jsx`)

1. Lista e apaga objetos S3 em `event-documents/{eventId}/`.
2. Busca participantes e chama `deleteParticipants` (Lambda que apaga `Dependent` + `Participant` + atualiza contadores do `Event`).
3. Chama `deleteEvent`, a mutation automática do modelo `Event`.
4. Invalida cache de colaborador.

### Entidades que ficam órfãs

O `deleteEvent` é uma mutation automática do AppSync. O Amplify Gen 2 não faz cascade automático em relações `hasMany`, pelo que os filhos não são apagados:

| Entidade | Índice por `eventId` | Apagado hoje? |
|---|---|---|
| `EventSupplier` | `byEventId` | ❌ |
| `EventCollaborator` | `byEventId` | ❌ |
| `Role` | `byEventId` | ❌ |
| `EventScheduleEntry` | `byEventId` | ❌ |
| `DocumentFolder` | `byEventId` | ❌ |
| `NotionDocument` | `byEventId` | ❌ |
| `EmailLog` | campo `eventId` (sem GSI dedicado) | ❌ |
| `Participant` / `Dependent` | `gsi-Event.participants` / `gsi-Participant.dependents` | ✅ via `deleteParticipants` |

### Problema semelhante em `delete-user-data`

A Lambda `delete-user-data` já contém uma `cascadeDeleteEventRelatedData`, mas só apaga `Participant`, `Dependent` e `EventSupplier`. Também usa `Scan` em vez de `Query` por `eventId`, o que é mais lento e mais caro. As restantes entidades (`EventCollaborator`, `Role`, `DocumentFolder`, `EventScheduleEntry`, `NotionDocument`, `EmailLog`) continuam órfãs.

### Riscos do estado atual

- **Dados órfãos acumulam-se** — maior custo DynamoDB, queries mais lentas, relatórios inconsistentes.
- **Falhas parciais no cliente** — se o browser fechar a meio, o evento pode já ter sido apagado enquanto os filhos permanecem.
- **Duplicação de lógica** — `EventDelete.jsx` e `delete-user-data` fazem cascade de formas diferentes.
- **GDPR incompleto** — apagar um utilizador não remove todos os vestígios dos eventos que criou.

## Decision

### 1. Criar uma Lambda server-side `delete-event-cascade`

A responsabilidade de apagar um evento e todos os seus dados move-se para o servidor. O frontend passa a chamar uma única custom mutation.

A Lambda:

1. Recebe `eventId`.
2. Extrai `userId` da identidade AppSync (padrão ADR-019).
3. Verifica que o caller é **OWNER** do evento (CO_MANAGER e roles de staff **não** podem apagar eventos — o risco de destruir dados do dono é inaceitável).
4. Não aplica gate de billing — o delete de evento é sempre permitido, independentemente do estado da subscrição (conforme modelo canónico de billing, §4).
5. Faz `Query` por `eventId` nos GSIs de todas as entidades dependentes.
6. Apaga os dados por batches na ordem correta (filhos antes dos pais, e S3 **depois** de toda a metadata estar removida):
   - `Dependent` (via `participantId` de cada `Participant`)
   - `Participant`
   - `EventSupplier`
   - `EventCollaborator`
   - `Role`
   - `DocumentFolder`
   - `EventScheduleEntry`
   - `NotionDocument` (e o respetivo objeto S3 referenciado em `s3Key`)
   - `EmailLog`
7. Apaga objetos S3 em `event-documents/{eventId}/` (inclui documentos normais e Notion).
8. Apaga o registo `Event` **apenas no final, e só se todas as entidades filhas e objetos S3 tiverem sido removidos com sucesso**. Em falha parcial, o `Event` permanece — serve de marcador de que o delete está incompleto e de âncora para o retry.
9. Retorna um relatório de sucesso/falha por entidade.

### 2. Schema GraphQL

- Desativar a mutation automática `deleteEvent` no modelo `Event` (`.disableOperations(['delete'])`).
- Adicionar custom mutation:

```graphql
type DeleteEventCascadeResult {
  success: Boolean!
  deleted: DeleteEventCascadeCounts!
  failed: DeleteEventCascadeCounts!
  errors: [String!]!
}

type DeleteEventCascadeCounts {
  participants: Int
  dependents: Int
  eventSuppliers: Int
  collaborators: Int
  roles: Int
  documentFolders: Int
  scheduleEntries: Int
  notionDocuments: Int
  emailLogs: Int
  s3Objects: Int
  event: Int
}

mutation deleteEventCascade(eventId: ID!): DeleteEventCascadeResult
```

### 3. Frontend

`EventDelete.jsx` simplifica para uma única chamada:

```js
const [deleteEventCascade] = useDeleteEventCascadeMutation();
await deleteEventCascade(eventId).unwrap();
```

A lógica client-side de listar documentos S3, buscar participantes e orquestrar `deleteParticipants` + `deleteEvent` é removida. A chamada é envolvida no retry automático descrito na §8 (timeouts/erros transitórios apenas), mantendo o estado de loading durante as tentativas.

### 4. Reutilização no delete de utilizador

A Lambda `delete-user-data` passa a invocar `delete-event-cascade` para cada evento do utilizador, em vez de duplicar a lógica de cascade. Isso garante um único ponto de verdade e cobertura completa.

### 5. Atomicidade e tolerância a falhas

Não é viável uma transação DynamoDB única porque:

- `TransactWriteItems` tem limite de 25 itens.
- Os itens distribuem-se por várias tabelas.
- Eventos podem ter centenas de participantes/fornecedores.

A solução é **idempotente + ordenada + com reporting**:

- Apagar filhos antes dos pais.
- Usar `BatchWriteItem` com retries e exponential backoff.
- Se falhar a meio, retornar estado parcial; o frontend mostra "alguns dados não foram removidos" e oferece retry.
- **O `Event` nunca é apagado em falha parcial.** Enquanto existirem resíduos, o `Event` existe — o retry da mutation reencontra o evento, salta os filhos já removidos (idempotência) e completa o que falta. Sem esta regra, um `Event` apagado com resíduos por trás tornaria os órfãos invisíveis para sempre.
- **Fase 2:** adicionar um DynamoDB Stream no `Event` para cleanup async de resíduos (garantia eventual).

### 6. Idempotência

A Lambda deve ser idempotente:

- Se o `Event` já não existir, retorna sucesso (nada a fazer). Esta regra só é segura porque, pela §5, o `Event` é apagado exclusivamente após remoção completa dos filhos — a ausência do `Event` implica que o cascade terminou.
- Se uma entidade filha já tiver sido apagada (ex.: `ConditionalCheckFailedException` ou `ResourceNotFoundException`), continua para as restantes.
- O caller pode retryar a mutation em caso de erro transitório sem medo de duplicar deletes; cada retry retoma do estado atual e completa o que falta.

### 7. Race conditions e concorrência

Não existem locks distribuídos no DynamoDB. Durante o delete, um colaborador pode teoricamente criar novos `Participant`, `EventScheduleEntry`, etc. A estratégia é:

- O frontend desativa a UI de edição do evento enquanto o delete está em curso.
- A Lambda processa tudo o que encontrou no início da execução; registos criados depois do início do delete serão removidos na fase 2 (stream cleanup) ou no retry.
- O `Event` só é apagado no final, o que minimiza a janela de criação de novos filhos.

### 8. Performance e timeouts

O constraint dominante **não é** o limite de 15 min da Lambda — é o **timeout de 30 segundos do resolver AppSync**. Uma custom mutation síncrona é abortada aos 30s do lado do AppSync, mesmo que a Lambda continue a executar (é o mesmo limite que já forçou o import Notion a 5 páginas, ADR-023). Um evento com centenas de participantes, fornecedores e documentos (várias rondas de `BatchWriteItem` + paginação `ListObjectsV2` + deletes S3) pode ultrapassar 30s sem ser "gigante".

Estratégia da fase 1:

- A Lambda processa em chunks e é desenhada para terminar bem abaixo dos 30s no caso típico.
- **Timeout da Lambda alinhado com o AppSync (~29s)** — não faz sentido a Lambda continuar a trabalhar depois de o caller já ter recebido erro; o trabalho parcial fica consistente porque a ordem (filhos → S3 → `Event` no fim) e a idempotência garantem que nada se perde.
- Em caso de timeout, o frontend faz **retry automático e silencioso** (até 2 tentativas adicionais, ~90s no total), mantendo o estado "a apagar…" visível: como o `Event` só é apagado no fim (§5/§6), cada retry retoma onde a execução anterior ficou. O retry automático aplica-se **apenas a timeouts e erros transitórios** — erros de autorização ou de validação são mostrados imediatamente, sem retry. Só depois de esgotadas as tentativas é que o utilizador vê a mensagem de falha parcial (com opção de tentar de novo manualmente).
- **Fase 2:** para eliminar retries manuais, evoluir para invocação **async** (a mutation dispara e retorna imediatamente; conclusão via polling/subscription) com **AWS Step Functions** ou **SQS + worker** a fazer o trabalho, sem limite dos 30s.

### 9. Observabilidade

Toda a operação deve ser logged e metricizada:

- CloudWatch Logs: `eventId`, `userId`, contagens apagadas/falhadas por entidade, tempo total.
- CloudWatch Metrics: contadores de deletes bem-sucedidos, falhas parciais, timeouts.
- Alarme em falhas parciais para intervenção manual/SRE.

### 10. Backup e auditoria

Antes de apagar, a Lambda não faz backup (GDPR — direito ao esquecimento). Os registos
financeiros são a exceção e não são apagados: ver ADR-040, que os anonimiza em vez de os remover. No entanto, deve registar um **evento de auditoria**:

- `userId` que pediu o delete.
- `eventId`.
- Timestamp.
- Resultado (sucesso / parcial / falha).

Este registo pode ficar em CloudWatch Logs; não deve persistir dados pessoais do evento.

## Security Considerations

### Autorização

- Apenas o **OWNER** do evento pode invocar `deleteEventCascade`. CO_MANAGER, STAFF_LOGISTICS e STAFF_CHECKIN são rejeitados a priori.
- A verificação deve ser feita com `GetItem` na tabela `Event` e comparação de `owner` (normalizado com `split('::')[0]`). Pode reutilizar-se `resolveEventAccess`, mas a permission check final deve exigir role `OWNER` explicitamente.

### Proteção do modelo `Event`

- Desativar `delete` no modelo `Event` impede deletes diretos via AppSync, forçando todos os deletes pela Lambda.
- A Lambda apaga o `Event` via AWS SDK (IAM), pelo que a IAM role deve ter `dynamodb:DeleteItem` na tabela `Event`.

### Field-level auth do `planKey`

- O campo `Event.planKey` tem autorização `rules.owner().to(['read', 'delete'])`. Como a Lambda usa SDK direto (fora do AppSync), o delete não é bloqueado por esta regra. Devemos confirmar que a IAM role da Lambda tem permissão de delete na tabela `Event`.

### Isolamento entre utilizadores

- Todas as queries por `eventId` devem ser seguidas de verificação de ownership. Nunca apagar um item só porque o `eventId` bate certo — confirmar que o evento pertence ao caller.

### S3

- Apagar objetos S3 só dentro do prefixo `event-documents/{eventId}/`. Nunca usar `identityId` como proxy para o prefixo do evento (erro presente na `delete-user-data` atual).

### Prevenção de delete acidental em massa

- A mutation recebe um único `eventId`. Não aceita arrays nem wildcards.
- A Lambda `delete-user-data` que invoca esta mutation em loop deve ter rate-limiting interno ou invocar async para evitar sobrecarga.

## Consequences

### Positivas

- **Single source of truth** para apagar eventos.
- **Idempotente e tolerante a falhas** — falhas parciais são detectadas e reportadas.
- **Reutilizável** no delete de utilizador (GDPR).
- **Frontend simplificado** — deixa de orquestrar múltiplas chamadas e estados.
- **Performance melhorada** — usa `Query` por GSI em vez de `Scan`.
- **Menos dados órfãos** — todas as entidades conhecidas do evento são cobertas.

### Negativas

- **Não é totalmente atómico** — uma falha a meio pode deixar resíduos. Mitigado com idempotência, retries, a regra de nunca apagar o `Event` em falha parcial (§5) e (fase 2) stream de cleanup.
- **Eventos grandes podem exigir retries** — o timeout de 30s do AppSync (§8) pode abortar a mutation antes do fim; o delete completa-se por retry automático no frontend (transparente para o utilizador) até a fase 2 introduzir execução async.
- **Maior complexidade na Lambda** — precisa de conhecer todas as relações do evento.
- **Maior permissão IAM** — a Lambda precisa de acesso de delete a várias tabelas e ao bucket S3.
- **EmailLog requer Scan ou novo GSI** — a tabela não tem GSI por `eventId`. A solução mais escalável é adicionar um GSI `byEventId`; alternativa é deixar o cleanup de `EmailLog` para a fase 2 (stream async).

## Decisões dependentes

As seguintes decisões devem ser confirmadas antes da implementação:

1. **Quem pode apagar o evento?** Apenas OWNER (recomendado), ou também CO_MANAGER? **Recomendação:** OWNER apenas.
2. **Gate de billing no delete?** Manter delete sempre permitido, conforme modelo canónico. **Recomendação:** sim, não aplicar gate de billing no delete.
3. **Soft-delete vs hard-delete?** Manter hard-delete como hoje (recomendado), ou introduzir lixeira? **Recomendação:** hard-delete, conforme GDPR.
4. **EmailLog cleanup:** Adicionar GSI `byEventId` à tabela `EmailLog` na fase 1, ou deixar para cleanup async na fase 2? **Recomendação:** adicionar GSI na fase 1 para evitar Scans caros.
5. **Reutilização no `delete-user-data`:** Invocar a Lambda `delete-event-cascade` (sync, risco de timeout) ou extrair a lógica para um módulo partilhado chamado localmente? **Recomendação:** módulo partilhado para evitar timeouts em contas com muitos eventos.
6. **Cleanup async via Stream?** Fase 2, após a Lambda estar estável. **Recomendação:** sim.
7. **NotionDocument + S3:** Apagar também o ficheiro Markdown referenciado em `s3Key` (recomendado). **Recomendação:** sim.

## Implementation Checklist (para o plano de trabalho)

- [ ] Criar `amplify/function/delete-event-cascade/` (resource.ts + handler.ts).
- [ ] Adicionar custom mutation `deleteEventCascade` em `amplify/data/resource.ts`.
- [ ] Desativar `delete` no modelo `Event`.
- [ ] Registrar Lambda, env vars e IAM policies em `amplify/backend.ts`.
- [ ] Adicionar endpoint `deleteEventCascade` em `src/Api/services/eventApi.js`.
- [ ] Refatorar `src/Components/Event/EventDelete.jsx` para usar a nova mutation.
- [ ] Refatorar `amplify/function/delete-user-data/handler.ts` para reutilizar a lógica de cascade (módulo partilhado, não invocação sync de Lambda).
- [ ] Adicionar GSI `byEventId` à tabela `EmailLog` (se decisão 4 for adicionar na fase 1).
- [ ] Escrever testes unitários em `amplify/function/__tests__/delete-event-cascade.test.ts`.
- [ ] Escrever testes de segurança: CO_MANAGER tenta apagar e é rejeitado; utilizador sem acesso tenta apagar evento de outro e é rejeitado.
- [ ] Configurar CloudWatch Metrics + alarme para falhas parciais.
- [ ] Atualizar i18n (pt-PT, en-US, fr-FR) se novas mensagens de erro forem introduzidas.

## References

- `src/Components/Event/EventDelete.jsx`
- `amplify/function/delete-user-data/handler.ts`
- `amplify/function/delete-participants/handler.ts`
- `amplify/data/resource.ts` (modelos `Event`, `EventSupplier`, `EventCollaborator`, `Role`, `DocumentFolder`, `EventScheduleEntry`, `NotionDocument`, `EmailLog`)
- ADR-013 — DynamoDB Owner Authorization & Composite Keys
- ADR-019 — Event-Scoped Roles
- ADR-021 — Document Folder Lambda CRUD
- `docs/plans/2026-07-11-billing-subscription-model.md` §4 (janela de escrita)

## Changelog

| Date | Author | Description |
|---|---|---|
| 2026-07-14 | Ney Carvalho | Initial proposal — server-side cascade deletion for events. |
| 2026-07-14 | Ney Carvalho | Timeout de 30s do AppSync como constraint dominante (§8, retry na fase 1, async na fase 2); `Event` nunca é apagado em falha parcial, alinhando §5/§6 com a regra de idempotência. |
| 2026-07-14 | Ney Carvalho | Retry pós-timeout passa a ser automático e silencioso no frontend (até 2 tentativas extra, só em erros transitórios); falha parcial só é mostrada ao utilizador depois de esgotadas as tentativas. |
| 2026-07-14 | Ney Carvalho | Fase 1 implementada e validada (PR #163): módulo partilhado, Lambda OWNER-only, schema, frontend e refactor GDPR. Testado end-to-end no sandbox (OWNER, não-OWNER, idempotência). Status → Accepted. |
