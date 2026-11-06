/**
 * @file useAuthz.js
 * @description Entitlements do plano para a UI (camada ABAC do modelo de
 * autorização) — complementa useEventRole (RBAC do evento, ADR-019).
 *
 * A fonte é o backend: `access {planKey, writable, reason}` vem na resposta do
 * getEventAsCollaborator (mesma cache RTK do useEventRole — zero queries
 * extra). Os limites/features derivam de src/Utils/plans.js a partir do
 * planKey. Tudo aqui é COSMÉTICO (§4b): a autoridade é a Lambda; a UI só
 * esconde botões, mostra contadores e prompts de upgrade.
 */

import { useMemo } from 'react';
import { useGetEventAsCollaboratorQuery } from '../Api/services/collaboratorApi';
import { PLANS, PLAN_KEYS } from '../Utils/plans';

// Fração do teto a partir da qual a UI avisa, antes de bloquear.
const WARN_THRESHOLD = 0.8;

// Contrato de recusa das Lambdas gated (shared/entitlementGate.ts).
export const BILLING_GATE_PREFIX = 'BILLING_GATE:';

/** True se a mensagem de erro de uma mutation veio do gate de billing. */
export const isBillingGateMessage = (message) =>
  typeof message === 'string' && message.startsWith(BILLING_GATE_PREFIX);

/** Extrai o reason (ex.: WINDOW_EXPIRED) de uma mensagem BILLING_GATE:*. */
export const billingGateReason = (message) =>
  isBillingGateMessage(message) ? message.slice(BILLING_GATE_PREFIX.length) : null;

// As Lambdas gated que LANÇAM (agenda, roles, suppliers) chegam ao frontend em
// formas diferentes consoante o baseQuery: erro RTK ({message, data}), o
// GraphQLResult da Amplify (errors[]), ou embrulhadas noutra mensagem — o
// padrão procura o reason em qualquer uma.
const GATE_REASON_PATTERN = /BILLING_GATE:([A-Z_]+)/;

// Reasons com copy própria em common:billingGate.* (e para os quais o CTA de
// upgrade faz sentido); os restantes caem no genérico.
export const BILLING_GATE_KNOWN_REASONS = new Set([
  'WINDOW_EXPIRED',
  'PRO_LAPSED',
  'PRO_PAUSED',
  'LIMIT_SUPPLIERS',
  'LIMIT_PARTICIPANTS',
  // LIMIT_FOLDERS saiu com o teto de pastas (ADR-038): a Lambda ainda o pode
  // lançar, mas sem copy própria cai no genérico — que é o correto enquanto o
  // limite for Infinity e ninguém lá chegar.
  'STARTER_LIMIT_REACHED',
]);

/** Key i18n (relativa ao namespace common) para um reason do gate. */
export const billingGateMessageKey = (reason) =>
  BILLING_GATE_KNOWN_REASONS.has(reason) ? `billingGate.${reason}` : 'billingGate.generic';

/**
 * Title de um botão de escrita bloqueado — read-only primeiro (é o bloqueio
 * mais forte; "limite atingido" seria enganoso nesse estado), depois limite.
 * Fonte única da precedência, usada por todos os botões Add/Import gated.
 */
export const writeBlockedTitle = (t, { writable, reason, limitReached, limitMessage }) =>
  !writable
    ? t(`common:${billingGateMessageKey(reason)}`)
    : limitReached
      ? limitMessage
      : undefined;

/**
 * Key i18n para o erro de uma mutation: copy própria do gate se a recusa for
 * BILLING_GATE:* (com o porquê), senão a key genérica da operação.
 */
export const billingGateErrorKey = (error, fallbackKey) => {
  const reason = billingGateReasonFromError(error);
  return reason ? `common:${billingGateMessageKey(reason)}` : fallbackKey;
};

/** Extrai o reason de qualquer forma de erro de mutation; null se não for gate. */
export const billingGateReasonFromError = (error) => {
  const candidates = [
    error?.message,
    error?.data?.message,
    ...(Array.isArray(error?.errors) ? error.errors.map((e) => e?.message) : []),
    ...(Array.isArray(error?.data?.errors) ? error.data.errors.map((e) => e?.message) : []),
  ];
  for (const candidate of candidates) {
    const match = typeof candidate === 'string' && candidate.match(GATE_REASON_PATTERN);
    if (match) return match[1];
  }
  return null;
};

/**
 * @param {string} eventId
 * @returns {{
 *   planKey: string,
 *   entitlements: Object,
 *   writable: boolean,
 *   reason: string|null,
 *   limit: (key: string, current: number) => {max: number, remaining: number, reached: boolean},
 *   isLoading: boolean,
 * }}
 */
export const useAuthz = (eventId) => {
  const { data, isLoading } = useGetEventAsCollaboratorQuery(
    { eventId },
    { skip: !eventId }
  );

  return useMemo(() => {
    const access = data?.access || null;
    const known = access?.planKey && PLANS[access.planKey] ? access.planKey : null;

    // Fail-open: sem access (a carregar, query skipped, backend antigo) ou
    // planKey desconhecido, NADA se tranca — o gate real está na Lambda; a UI
    // só mostra locks que consegue justificar. Nível pago = sem restrições.
    const planKey = known;
    const catalog = known ? PLANS[known].entitlements : PLANS[PLAN_KEYS.PRO].entitlements;
    // Teto do escalão já RESOLVIDO pelo backend (ADR-038): ausente = o do
    // catálogo. A regra de quando congela vive só no núcleo do gate — aqui a UI
    // limita-se a honrar o número que recebeu.
    const entitlements = Number.isFinite(access?.participantLimit)
      ? { ...catalog, participants: access.participantLimit }
      : catalog;
    const writable = known ? Boolean(access.writable) : true;
    const reason = known ? access?.reason || null : null;

    const limit = (key, current) => {
      const max = entitlements[key];
      if (!Number.isFinite(max)) {
        return { max: Infinity, remaining: Infinity, reached: false, approaching: false };
      }
      const used = Number(current) || 0;
      const reached = used >= max;
      return {
        max,
        remaining: Math.max(0, max - used),
        reached,
        // Fricção progressiva antes do bloqueio, só no teto PAGO (ADR-038): num
        // plano gratuito o bloqueio duro é o correto, e o que se recomenda para
        // quem já pagou é avisar antes de recusar. Sem isto o cliente encontra
        // um erro inesperado porque nada o avisou.
        approaching: planKey === PLAN_KEYS.PAY_PER_EVENT && !reached && used >= max * WARN_THRESHOLD,
      };
    };

    return { planKey, entitlements, writable, reason, limit, isLoading };
  }, [data, isLoading]);
};

export default useAuthz;
