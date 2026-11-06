/**
 * @file billing/get-account-access/handler.ts
 * @description "Posso criar um evento?" para a UI (§3). Read-only: espelha a
 * decisão de resolveAccountEntitlements sem expor detalhes internos de consumo.
 */
import type { AppSyncResolverEvent } from 'aws-lambda';

import { resolveAccountEntitlements } from '../../shared/resolveAccountEntitlements';

interface AccountAccessResult {
  planKey: string | null;
  canCreateEvent: boolean;
  reason: string;
}

export const handler = async (
  event: AppSyncResolverEvent<Record<string, never>>
): Promise<AccountAccessResult> => {
  const identity = event.identity as { sub?: string } | undefined;
  const userId = identity?.sub;
  if (!userId) {
    return { planKey: null, canCreateEvent: false, reason: 'UNAUTHENTICATED' };
  }

  const { planKey, canCreateEvent, reason } = await resolveAccountEntitlements({
    userId,
    eventTableName: process.env.BAFATORIO_APP_EVENT_TABLE_NAME || '',
    subscriptionTableName: process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME || '',
    planPurchaseTableName: process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME || '',
  });

  return { planKey, canCreateEvent, reason };
};
