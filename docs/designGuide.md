# Design Guide — Notas

Complementa o **ADR-011** (arquitetura do design system) e o **ADR-025** (theming por CSS variables). Aqui ficam decisões de design pontuais que não justificam um ADR próprio.

## Cores de identidade das secções (EventDetailsCard)

O card de detalhes do evento (`src/Components/EventDetails/EventDetailsCard.jsx`) agrupa a informação em secções, cada uma com **uma cor de identidade** — para leitura e reconhecimento rápidos, à semelhança das cores por role (`RoleBadge`) e por estado (`StatusBadge`).

| Secção | Cor (escala Tailwind) | Papel |
|--------|-----------------------|-------|
| Quando & Onde | `orange` | data, hora, local |
| Organização | `violet` | gestor, contactos |
| Perfil do evento | `pink` | participantes, categorias, tipo de acesso |
| Resumo financeiro | `blue` | orçamento (gated por `FINANCIAL_VIEW`) |

**Regra: identidade ≠ semântica.** As cores das secções são apenas *identidade* (tint de fundo + ícone + título). As cores **semânticas** — `success` / `warning` / `error` — ficam reservadas ao **estado real**, não à decoração. Por isso, na secção financeira:

- A cor da secção é `blue` (identidade neutra).
- A **barra de saúde do orçamento** usa `success` (≤60% usado), `warning` (60–85%) ou `error` (>85%) — isto é *estado*, calculado em `src/Utils/budgetHealth.js`.

Dar ao financeiro uma cor neutra (`blue`) — e não verde — evita que a identidade da secção compita com o verde de "orçamento saudável" da barra de saúde: a cor da secção é fixa, a da barra muda com o estado.

### Porquê estas 4 cores

`orange` / `violet` / `pink` / `blue` são hues bem separados no círculo cromático (evita o problema de `primary`≈`secondary`, quase indistinguíveis) e já existem no vocabulário de dots dos badges de role/estado. Não foram adicionados tokens novos ao `tailwind.config.js` — são escalas utilitárias do Tailwind, aplicadas via classes (nunca valores arbitrários, conforme ADR-011).
