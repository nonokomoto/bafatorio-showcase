# ADR-039: Invalidação cruzada entre slices RTK Query

**Status:** Aceite
**Data:** 2026-08-04
**Autor:** Alex Silva
**Relacionado:** ADR-005 (frontend/RTK Query), ADR-012 (relational queries + cache), ADR-016 (histórico — já identificava o sintoma sem o generalizar), ADR-019 (event-scoped roles)

---

## Contexto

O frontend usa vários slices RTK Query independentes (`participantApi`, `roleApi`, `supplierApi`, `eventSupplierApi`, `dependentApi`, `fidelizeApi`, …), um por área funcional. A invalidação de cache do RTK Query (`invalidatesTags` / `util.invalidateTags`) só tem efeito **dentro do mesmo `createApi`** — invalidar uma tag num slice não afeta o cache de outro slice, mesmo que ambos declarem `tagTypes` com o mesmo nome.

Vários Lambdas, como efeito colateral de uma mutation, criam ou alteram registos de um modelo que "pertence" a outro slice:

- `upload-participant` (Lambda) cria `Role`s novas via `resolveRoleId`, mas é despoletado pela mutation `uploadParticipants` do `participantApi` — o `roleApi` nunca é avisado.
- `import-normalized-event-suppliers` (Lambda) pode criar `Supplier`s novos (dual-write), mas é despoletado pela mutation `importNormalizedEventSuppliers` do `eventSupplierApi` — o `supplierApi` nunca é avisado.
- `createDependentCustom`/`updateDependentCustom`/`deleteDependentCustom` alteram o `dependentsCount` cacheado no `participantApi`, mas são disparados a partir do `dependentApi`.

Em todos os três casos, a mutation "originadora" tentava mitigar isto invalidando uma tag **no seu próprio slice** (ex.: `eventSupplierApi` invalidava `{ type: 'Supplier', id: 'LIST' }` dentro de si mesma) — mas nenhuma query desse slice fornece essa tag, por isso a invalidação era um no-op silencioso. O sintoma visível: dados criados por importação/sync ficavam invisíveis na UI (ex.: participante importado sem o role do ficheiro a aparecer) até um reload manual da página.

O padrão correto já existia isolado num sítio — `fidelizeApi.js` (sync da Fidelize) já despachava `roleApi.util.invalidateTags(...)` corretamente — mas nunca foi generalizado nem repetido nos outros três pontos, porque não havia uma convenção explícita nem um mecanismo que tornasse o erro visível em code review.

---

## Decisão

### 1. Cada slice exporta um helper `invalidateX` para o(s) seu(s) tag(s) mais consumido(s) em cenários cross-slice

```javascript
// roleApi.js
export const invalidateEventRoles = (dispatch, eventId) => {
  if (!eventId) return;
  dispatch(roleApi.util.invalidateTags([{ type: 'Role', id: `LIST_${eventId}` }]));
};

// supplierApi.js
export const invalidateSupplierList = (dispatch) => {
  dispatch(supplierApi.util.invalidateTags([{ type: 'Supplier', id: 'LIST' }]));
};

// participantApi.js
export const invalidateParticipant = (dispatch, { participantId, eventId } = {}) => {
  const tags = [];
  if (participantId) tags.push({ type: 'Participant', id: participantId });
  if (eventId) tags.push({ type: 'Participant', id: `LIST_${eventId}` });
  if (tags.length > 0) dispatch(participantApi.util.invalidateTags(tags));
};
```

O helper vive no slice **dono** da tag (quem a declara em `providesTags`), não no slice chamador. Isto significa que só um sítio no código sabe a forma exata da tag (`LIST_${eventId}` vs `LIST` vs id simples) — se essa forma mudar, só o helper muda.

### 2. Regra: mutation cujo Lambda pode criar/alterar um modelo doutro slice DEVE invalidar esse slice explicitamente

Sempre que uma mutation RTK Query invoca um Lambda que escreve (create/update) num modelo que não é o "dono" desse slice (mesmo que indiretamente, como efeito colateral de import/sync), a mutation tem de:

1. Importar o helper `invalidateX` do slice dono desse modelo.
2. Chamá-lo dentro de `onQueryStarted`, depois de `await queryFulfilled`, só em caso de sucesso real (não apenas ausência de erro GraphQL — verificar também flags de sucesso no payload, quando existem).

```javascript
async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled;
    if (data?.uploadParticipants?.success) {
      invalidateEventRoles(dispatch, eventId);
    }
  } catch {
    // mutation falhou — nada para invalidar
  }
},
```

**Nunca** tentar invalidar a tag do modelo alheio dentro do próprio `invalidatesTags` do slice chamador — isso só invalida esse mesmo slice, mesmo que a tag tenha o nome certo.

### 3. Checklist ao adicionar/alterar uma mutation Lambda-backed

Antes de dar como terminada uma mutation nova ou alterada que invoca um Lambda:

- O Lambda escreve nalguma tabela que não é a do modelo principal desta mutation?
- Se sim, existe um slice RTK Query que lê essa tabela? Qual a tag que ele fornece (`providesTags`)?
- Existe já um helper `invalidateX` exportado por esse slice? Se não, criar um.
- A mutation despacha esse helper em `onQueryStarted`, só em sucesso?
- Existe um teste de regressão que mocka o helper e confirma que é chamado (ver `src/Api/services/__tests__/*.crossInvalidate.test.js`)?

### 4. Circularidade de imports entre slices

Importar o helper de outro slice pode criar uma dependência circular entre ficheiros `createApi` (ex.: `eventSupplierApi.js` → `supplierApi.js` → `eventSupplierApi.js`, já que `supplierApi.js` já invalidava `eventSupplierApi` na direção inversa). Isto é seguro neste caso: o `dispatch`/`.util.invalidateTags` só é referenciado dentro de callbacks assíncronos (`onQueryStarted`), nunca durante a avaliação síncrona do módulo — por isso o ciclo resolve-se corretamente em ESM (Vite/Jest). Confirmado pelos testes de integração desta ADR (194 testes nas suites `supplier`/`eventSupplier` + as novas `crossInvalidate`, todos verdes com o ciclo em vigor).

---

## Ficheiros alterados (motivadores desta ADR)

| Ficheiro | Alteração |
|----------|-----------|
| `src/Api/services/roleApi.js` | Exporta `invalidateEventRoles` |
| `src/Api/services/supplierApi.js` | Exporta `invalidateSupplierList` |
| `src/Api/services/participantApi.js` | Exporta `invalidateParticipant`; `uploadParticipants` invalida `roleApi` no sucesso |
| `src/Api/services/fidelizeApi.js` | `syncFidelizeParticipants` passa a usar `invalidateEventRoles` (antes despachava a tag à mão) |
| `src/Api/services/eventSupplierApi.js` | `importNormalizedEventSuppliers` invalida `supplierApi` no sucesso; removida a invalidação no-op no próprio slice |
| `src/Api/services/dependentsApi.js` | `createDependent`/`updateDependent`/`deleteDependent` invalidam `participantApi` no sucesso; removida a invalidação no-op no próprio slice |
| `src/Api/services/__tests__/crossSliceInvalidation.helpers.test.js` | Testes unitários dos 3 helpers |
| `src/Api/services/__tests__/participantApi.uploadParticipants.crossInvalidate.test.js` | Testes de wiring |
| `src/Api/services/__tests__/eventSupplierApi.importNormalizedEventSuppliers.crossInvalidate.test.js` | Testes de wiring |
| `src/Api/services/__tests__/dependentsApi.crossInvalidate.test.js` | Testes de wiring |

---

## Consequências

- Dados criados como efeito colateral de um Lambda (roles no import de participantes, suppliers no dual-write import) aparecem na UI imediatamente após a operação, sem reload manual.
- A forma da tag (`LIST_${eventId}` vs `LIST`) fica centralizada no slice dono — reduz o risco de um chamador futuro construir a tag errada.
- Fica um checklist explícito e pesquisável para a próxima vez que uma mutation Lambda-backed precisar de invalidar outro slice — antes disto, o padrão só existia por imitação implícita de `fidelizeApi.js`, e foi esquecido três vezes.
- Não resolve o caso em que a UI depende inteiramente da cache de outro slice sem *nenhum* fallback relacional (ex.: `listParticipantsByEventLambda` só pede `roleId`, nunca `role.name`) — isto é uma defesa em profundidade que fica fora do âmbito desta ADR e pode ser considerada separadamente se o mesmo sintoma reaparecer.
