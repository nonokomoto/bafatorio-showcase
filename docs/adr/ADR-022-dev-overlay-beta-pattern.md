# ADR-022: DevOverlay — Padrão de Bloqueio de Componentes em Beta

## Status

Accepted (2026-02-20) — Revisado (2026-02-20)

## Context

Durante a fase de testes beta, parte do produto está funcional mas outras secções ainda estão em desenvolvimento activo. É necessário um mecanismo que:

1. Bloqueie a interacção do utilizador com componentes inacabados
2. Comunique claramente que a funcionalidade está "em desenvolvimento"
3. Seja activado/desactivado num único ficheiro central — sem tocar no corpo dos componentes
4. **Não faça API calls desnecessárias** — componentes WIP não devem montar

### Decisão de design: sempre modal

O padrão wrapper (`<DevOverlay><Componente /></DevOverlay>`) foi abandonado porque:
- O componente ainda **monta** — hooks e RTK Query disparam API calls desnecessárias
- Mostra conteúdo borrado e incompleto por baixo do overlay
- UX inconsistente vs. o padrão modal

**Padrão adoptado**: WIP é sempre apresentado como um **overlay centrado** no contentor `#main-content` (ou `portalId` customizado), via `createPortal` com `absolute inset-0`. O componente WIP **nunca monta**. Zero API calls.

### Problema do Portal em Modais

O `Modal.jsx` usa `createPortal()` para renderizar em `#modal-root`. Um `WipGuard` externo não cobre o conteúdo dentro do portal. Por isso o overlay tem de ser injectado **dentro** do Modal — e o Modal precisa de saber que está em modo WIP.

## Decision

### Três peças

#### 1. `src/Utils/devStages.js` — fonte única de verdade

```js
export const WIP_COMPONENTS = {
  SEND_EMAIL: true,   // mudar para false quando pronto
  DASHBOARD: true,
};
```

#### 2. `WipGuard` (exportado de `DevOverlay.jsx`) — padrão principal

Renderiza um overlay centrado via `createPortal` com `absolute inset-0` no contentor alvo (`portalId`, por defeito `#main-content`) **sem montar os children**. O contentor alvo deve ter `position: relative`. Usar para páginas e secções.

```jsx
// Página (App.jsx):
<Route path="dashboard" element={
  <WipGuard active={WIP_COMPONENTS.DASHBOARD}>
    <Dashboard />   {/* nunca monta quando active=true */}
  </WipGuard>
} />

// Sub-rota (Settings.jsx):
<Route path="billing" element={
  <WipGuard active={WIP_COMPONENTS.SETTINGS_BILLING}>
    <SubscriptionManagement />
  </WipGuard>
} />
```

#### 3. `Modal.jsx` — prop `wip` (caso especial)

Para modais que usam `createPortal`, o overlay tem de ser injectado **dentro** do modal. O Modal aceita `wip={boolean}`:
- Renderiza `<DevOverlay className="absolute inset-0 z-20 rounded-xl overflow-hidden" />` por cima do conteúdo
- Eleva o botão fechar (X) para `z-30`, mantendo-o acessível

```jsx
<Modal isOpen={isOpen} onClose={onClose} wip={WIP_COMPONENTS.SEND_EMAIL}>
  {/* conteúdo do modal */}
</Modal>
```

### Fluxo de trabalho

| Acção | O que fazer |
|-------|-------------|
| Marcar **página** como WIP | `devStages.js`: nova entrada + `<WipGuard>` na rota (`App.jsx` ou ficheiro de settings) |
| Marcar **secção** como WIP | `devStages.js`: nova entrada + `<WipGuard>` em volta do elemento na rota |
| Marcar **modal** como WIP | `devStages.js`: nova entrada + `wip={WIP_COMPONENTS.X}` no `<Modal>` |
| Lançar funcionalidade | `devStages.js`: mudar para `false` — **zero** alterações nos componentes |
| Trabalhar no componente | Desligar temporariamente em `devStages.js`; religar ao terminar |

## Inventário de Componentes WIP

| Chave | Componente | Localização | Tipo |
|-------|------------|-------------|------|
| ~~`SEND_EMAIL`~~ | ~~Envio de Email a Participantes~~ | ~~`SendEmail/index.jsx`~~ | ~~Modal (`wip` prop)~~ — **lançado 2026-08-10** |
| `DASHBOARD` | Dashboard | `App.jsx` rota `dashboard` | `WipGuard` |
| `PLAN_SELECTION` | Selecção de Plano | `App.jsx` rota `plan-selection` | `WipGuard` |
| `SETTINGS_BILLING` | Gestão de Subscrição | `Settings.jsx` rota `billing` | `WipGuard` (portalId: settings-content) |
| `SETTINGS_NOTIFICATION` | Notificações | `Settings.jsx` rota `notification` | `WipGuard` (portalId: settings-content) |
| ~~`SETTINGS_SECURITY`~~ | ~~Segurança~~ | ~~`Settings.jsx` rota `security`~~ | ~~`WipGuard` (portalId: settings-content)~~ — **lançado 2026-08-10** |
| `SETTINGS_INTEGRATION` | Integrações | `Settings.jsx` rota `integration` | `WipGuard` (portalId: settings-content) — `false` (bloqueada via WIP guard; Fidelize + Notion) |
| ~~`CONFIRM_PRESENCE`~~ | ~~Confirmação de Presença~~ | ~~`App.jsx` rota `confirm-presence`~~ | ~~`WipGuard`~~ — **lançado 2026-02-24** |

> Actualizar esta tabela sempre que um novo componente for marcado como WIP ou lançado.

## Consequences

- Activar/desactivar qualquer componente WIP é uma alteração de **uma linha** em `devStages.js`
- Componentes WIP **nunca montam** — zero API calls, zero chunks lazy-loaded
- UX consistente: WIP é sempre um modal centrado, independente do tipo de componente
- O `DevOverlay` (componente base) mantém-se para o caso especial de modais via `wip` prop
- O padrão é extensível: qualquer rota futura usa `<WipGuard active={WIP_COMPONENTS.NOVA_FEATURE}>`

## Changelog

| Data | Alteração |
|------|-----------|
| 2026-02-20 | ADR inicial — DevOverlay + devStages + Modal wip prop |
| 2026-02-20 | Revisão — WipGuard como padrão único; abandonado wrapper DevOverlay; WipGuard usa absolute inset-0 via createPortal para #main-content (ou portalId customizado) |
| 2026-02-20 | Correcção de documentação — actualizado padrão de fixed/modal-root para absolute/portalId para reflectir implementação real |
| 2026-03-20 | Corrigido comentário SETTINGS_INTEGRATION (flag é false/bloqueada) |
