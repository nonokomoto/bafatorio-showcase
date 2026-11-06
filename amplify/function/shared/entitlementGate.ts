/**
 * @file entitlementGate.ts
 * @description Camada de IMPOSIÇÃO dos entitlements nas Lambdas gated.
 *
 * As funções de decisão (resolveEventEntitlements / resolveAccountEntitlements)
 * respondem "o que é permitido"; este módulo converte a resposta em recusa
 * uniforme — erro com prefixo `BILLING_GATE:<REASON>` que o frontend deteta e
 * mapeia para i18n/prompt de upgrade. Handlers que devolvem {success, message}
 * apanham o erro com isBillingGateError e devolvem a message em vez de lançar.
 */
import {
  resolveEventEntitlements,
  type EventEntitlementsRecord,
  type ResolvedEventEntitlements,
} from './resolveEventEntitlements';
import type { Entitlements } from './plans';

export const BILLING_GATE_PREFIX = 'BILLING_GATE:';

export const isBillingGateError = (error: unknown): boolean =>
  error instanceof Error && error.message.startsWith(BILLING_GATE_PREFIX);

const gateError = (reason: string): Error => new Error(`${BILLING_GATE_PREFIX}${reason}`);

/**
 * Para handlers que devolvem resultados tipados em vez de lançar: extrai a
 * message de uma recusa do gate; qualquer outro erro relança (fail fast).
 * Uso: `catch (e) { return {...refusalShape, message: billingGateMessage(e)}; }`
 */
export const billingGateMessage = (error: unknown): string => {
  if (isBillingGateError(error)) {
    return (error as Error).message;
  }
  throw error;
};

type CountableEntitlement = 'events' | 'participants' | 'suppliers' | 'documents' | 'folders';

/**
 * Janela de escrita (§4): resolve o gate do evento e lança se não for writable.
 * Devolve o resultado resolvido para os handlers reutilizarem (entitlements,
 * planKey) sem repetir as leituras.
 */
export const ensureEventWritable = async (args: {
  eventTableName: string;
  subscriptionTableName: string;
  eventId: string;
  // Event COMPLETO já carregado pelo handler — poupa o segundo GetItem.
  eventRecord?: EventEntitlementsRecord;
  now?: Date;
}): Promise<ResolvedEventEntitlements> => {
  const resolved = await resolveEventEntitlements(args);
  if (!resolved.writable) {
    throw gateError(resolved.reason);
  }
  return resolved;
};

/**
 * Limite de contagem (creates/imports): recusa se currentCount + incoming
 * ultrapassar o limite do plano. Infinity (nível pago) passa sempre.
 */
export const ensureWithinLimit = (
  entitlements: Entitlements,
  key: CountableEntitlement,
  currentCount: number,
  incoming = 1
): void => {
  const limit = entitlements[key];
  if (currentCount + incoming > limit) {
    throw gateError(`LIMIT_${key.toUpperCase()}`);
  }
};

/** Integrações (Notion, Fidelize, …) — feature binária do nível pago. */
export const ensureIntegrationsAllowed = (entitlements: Entitlements): void => {
  if (!entitlements.integrations) {
    throw gateError('NO_INTEGRATIONS');
  }
};
