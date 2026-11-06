# ADR-028: Event Documents S3 — Threat Model e Defesa em Profundidade

## Status
**Accepted** | Data: 2026-04-23

## Contexto

A ADR-015 define uma matriz de permissões event-scoped (OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN) que governa o acesso a pastas e documentos. A secção 7 da ADR-015 especifica ainda regras de folder sharing (`sharedFolderIds`), e as linhas 645-649 clarificam que:

- STAFF_LOGISTICS pode aceder a pastas próprias e partilhadas
- STAFF_LOGISTICS só pode editar/apagar documentos em pastas próprias
- Pastas partilhadas são `upload-only` para colaboradores que não são owners da pasta

Estas regras estão enforçadas nos Lambdas:

- [create-event-folder](../../amplify/function/create-event-folder/handler.ts), [update-event-folder](../../amplify/function/update-event-folder/handler.ts), [delete-event-folder](../../amplify/function/delete-event-folder/handler.ts)
- [list-event-folders](../../amplify/function/list-event-folders/handler.ts)
- [save-document-edit](../../amplify/function/save-document-edit/handler.ts) (ADR-021)

A política S3 do bucket `event-documents/*`, definida em [amplify/storage/resource.ts](../../amplify/storage/resource.ts), **não replica estas regras ao nível da camada S3**. Esta ADR documenta a divergência consciente entre camadas, o threat model aceite, e as mitigações futuras disponíveis.

## Decisão

Manter a arquitetura atual em que:

1. A política S3 sobre `event-documents/*` concede acesso uniforme a todos os utilizadores autenticados dos grupos USER / ADMIN (read, write, delete).
2. O enforcement de permissões event-scoped (role, `sharedFolderIds`, folder ownership) vive exclusivamente na camada aplicacional — Lambdas verificados via AppSync e checks na UI.
3. Uploads e deletes de ficheiros continuam a ser feitos diretamente pelo frontend via Amplify Storage SDK (não passam por Lambda dedicado). Apenas o edit de documentos existentes é canalizado pelo Lambda `saveDocumentEdit` (ADR-021), que emite presigned PUT URL de curta duração.

### Configuração atual

**Bucket policy** ([amplify/storage/resource.ts:21-24](../../amplify/storage/resource.ts)):

```typescript
'event-documents/*': [
    allow.authenticated.to(['read']),
    allow.groups(['USER', 'ADMIN']).to(['read', 'write', 'delete'])
]
```

**Path convention**: `event-documents/{eventId}/{folderId}/{fileName}` — sem `{identity_id}` no prefixo, porque os ficheiros são partilhados entre colaboradores do mesmo evento.

**Paths de escrita server-side** (com IAM scoped a `event-documents/*`):

- `saveDocumentEdit` — emite presigned `PutObject` para o exato `documentPath` (ADR-021)
- `notionImportPages` — `PutObject` e `DeleteObject` diretos pelo role do Lambda

## Threat Model

### Superfície exposta

Qualquer utilizador autenticado Cognito (role na plataforma = USER ou ADMIN; role no evento = OWNER, CO_MANAGER, STAFF_LOGISTICS, STAFF_CHECKIN, **ou nenhum**) que tenha credenciais AWS emitidas pelo Cognito Identity Pool pode invocar a S3 API diretamente, sem passar pela UI.

### Riscos aceites

| # | Risco | Quem explora | Impacto |
|---|---|---|---|
| T1 | Leitura cross-event de qualquer ficheiro em `event-documents/*` | Qualquer user autenticado, mesmo sem colaboração no evento alvo | Confidencialidade de documentos do cliente (contratos, mapas de orçamento, propostas) |
| T2 | Escrita/sobrescrita de ficheiros em qualquer evento | Qualquer USER ou ADMIN autenticado | Integridade — um colaborador bloqueado pela UI pode injetar/substituir ficheiros em pastas alheias |
| T3 | Eliminação de ficheiros em qualquer evento | Qualquer USER ou ADMIN autenticado | Disponibilidade — perda de dados de outros clientes |
| T4 | Bypass da regra "upload-only em pastas partilhadas" | STAFF_LOGISTICS autenticado | Pode editar/apagar ficheiros de outros colaboradores mesmo sem ser owner da pasta |
| T5 | Bypass da regra "STAFF_CHECKIN sem acesso a pastas" | STAFF_CHECKIN autenticado | Acede a qualquer ficheiro `event-documents/*` |

Todas estas regras são **enforçadas na UI e nos Lambdas**, mas **bypassáveis** por chamadas diretas ao S3 SDK com credenciais Cognito válidas.

### Riscos não aceites (fora do âmbito desta ADR)

- Utilizadores não autenticados — a política exige `authenticated` / group membership, portanto anonymous access está bloqueado.
- Exfiltração massiva via listagem — o path `event-documents/*` não concede `s3:ListBucket` explícito; a listagem por prefixo é possível se a identidade autenticada tiver `list` no path, o que a política atual **não** concede. Apenas `read` (GetObject) e, para USER/ADMIN, write/delete. Um atacante precisa de saber o `{eventId}/{folderId}/{fileName}` exato para descarregar — mas estes são deriváveis pelas queries GraphQL autenticadas que retornam `DocumentFolder` e `NotionDocument`.

## Justificação para aceitar

1. **Simplicidade arquitetural**. O path `event-documents/` partilhado (sem `{identity_id}`) permite que múltiplos colaboradores vejam os mesmos ficheiros sem copy/sync entre identity paths.
2. **Infraestrutura já parcial**. O padrão de presigned-URL-via-Lambda existe para edit ([ADR-021](ADR-021-document-folder-lambda-crud.md)). Replicá-lo para upload e delete é tecnicamente viável, mas exige:
   - Novos Lambdas (`requestDocumentUploadUrl`, `deleteDocument`)
   - Migração do `uploadData` / `remove` diretos no frontend (em [useDocumentsCache.js](../../src/Components/EventDetails/hooks/useDocumentsCache.js) e [Documents.jsx](../../src/Components/EventDetails/Documents.jsx)) para mutations GraphQL
   - Apertar bucket policy para negar write/delete direto ao Cognito Identity Pool
3. **Modelo de confiança actual**. Os utilizadores da plataforma são colaboradores convidados por um OWNER que assinou Terms of Service. Não há onboarding público/self-service para contas adversariais. O risco T1–T5 exige credenciais Cognito válidas, emitidas apenas após convite e aceitação.
4. **Custo/benefício**. Fechar totalmente a brecha exige 5–8 tarefas de backend + frontend + migração; o ROI depende do nível de sensibilidade dos documentos e da probabilidade de um colaborador tornar-se hostil. Hoje, baixo.

## Mitigações em vigor

- **Edit** é o único path com enforcement real ao nível S3: o bucket não permite `PutObject` direto sobre ficheiros existentes via credenciais Cognito (só Lambda roles com IAM scoped). Um user mal intencionado pode `PutObject` noutro eventId/folderId mas **não pode editar via UI path se esse path estiver fora da sua folder** — apenas via Lambda `saveDocumentEdit` que valida role + folder ownership.
- **Presigned URLs emitidos por `saveDocumentEdit` têm TTL curto** (definido por `PRESIGN_TTL_SECONDS` no handler) e são scoped ao exato `Key`.
- **AppSync operations** que retornam metadados de documentos (listEventFolders, get-event-as-collaborator, etc.) já filtram por role + `sharedFolderIds`, limitando a descoberta de `folderId`s alheios via canais legítimos.

## Mitigação futura (quando o risco subir)

Se a sensibilidade dos documentos, o número de colaboradores, ou a probabilidade de abuso aumentar, a arquitectura pode migrar para **Lambda-gated S3 access**:

### Esboço

1. **Novo Lambda `requestDocumentUploadUrl`**: recebe `eventId`, `folderId`, `fileName`, `contentType`; valida role + `sharedFolderIds` + matriz `document:create`; emite presigned `PutObject` URL com TTL curto.
2. **Novo Lambda `deleteDocument`**: recebe `documentPath`; valida role + folder ownership + matriz `document:delete`; faz `DeleteObject` server-side com o role IAM do Lambda.
3. **Frontend**: substituir `uploadData()` e `remove()` em [useDocumentsCache.js](../../src/Components/EventDetails/hooks/useDocumentsCache.js), [Documents.jsx](../../src/Components/EventDetails/Documents.jsx), e [InvoiceUpload.jsx](../../src/Components/Supplier/InvoiceUpload.jsx) por mutations GraphQL.
4. **Bucket policy**: remover `write` e `delete` de `allow.groups(['USER', 'ADMIN'])`. Manter apenas `read` para viewing (getUrl retorna presigned GET emitido pela UI autenticada). Eventualmente fechar o `read` também e emitir GET presigned via Lambda (`requestDocumentDownloadUrl`).
5. **Migração de dados**: nenhuma — o path convention não muda.

Quando chegar esse momento, abrir nova ADR (tipo ADR-0XX: Lambda-Gated Event Documents Access) com plano de execução detalhado.

## Consequências

### Positivas

- Arquitectura simples; uploads/deletes frontend diretos sem round-trip a Lambda.
- Zero alterações a fazer para manter o sistema consistente com a ADR-015 no happy path (UI).
- Risco documentado e visível — futuros auditores de segurança ou engenheiros encontram este ADR antes de assumirem que S3 enforce as regras da ADR-015.

### Negativas

- Defesa em profundidade incompleta: qualquer utilizador autenticado pode bypassar a ADR-015 saindo da UI.
- STAFF_CHECKIN (que a ADR-015 diz não ter acesso a pastas) tem de facto acesso S3 `read` a `event-documents/*`.
- Os mecanismos de partilha de pastas (`sharedFolderIds`) e ownership de folder são enforçados apenas na camada aplicacional.
- O `InvoiceUpload` e afins replicam a mesma brecha (ver [InvoiceUpload.jsx:134](../../src/Components/Supplier/InvoiceUpload.jsx) — `Storage.remove` direto).

## Referências

- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md) — matriz de permissões e folder sharing
- [ADR-017: Cognito Groups Supplier Sharing](ADR-017-cognito-groups-supplier-sharing-architecture.md) — grupos USER/ADMIN
- [ADR-021: Document Folder Lambda CRUD](ADR-021-document-folder-lambda-crud.md) — padrão saveDocumentEdit com presigned URL
- [amplify/storage/resource.ts](../../amplify/storage/resource.ts) — bucket policy actual
- [amplify/function/save-document-edit/handler.ts](../../amplify/function/save-document-edit/handler.ts) — único caminho atual com enforcement real ao nível S3

## Histórico

| Data | Autor | Alteração |
|---|---|---|
| 2026-04-23 | Ney Carvalho | ADR inicial documentando a divergência aceite entre S3 policy e ADR-015 |
