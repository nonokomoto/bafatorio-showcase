// React and related hooks
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaStar, FaExchangeAlt, FaPlus, FaReceipt, FaExternalLinkAlt, FaCreditCard, FaMoneyBill } from 'react-icons/fa';
import { SiVisa, SiMastercard, SiAmericanexpress, SiDiscover } from 'react-icons/si';
// i18n
import { useTranslation } from 'react-i18next';
// Data (modelo novo: UserSubscription + PlanPurchase + getAccountAccess)
import {
  useGetMySubscriptionQuery,
  useGetMyPaymentMethodQuery,
  useGetMyPlanPurchasesQuery,
  useCreateBillingPortalSessionMutation,
} from '../../Api/services/billingApi';
import { useGetAccountAccessQuery } from '../../Api/services/eventApi';
import { formatEUR } from '../Billing/CreatePlan/planConfig';
import { formatDateCompact } from '../../Utils/formatDate';
import { isPaidPlanKey } from '../../Utils/plans';
import { showToast } from '../../Redux/UI/toastSlice';
// UI
import Spinner from '../UI/spinner';
import { Card, Text, Badge, Button } from '../UI';

// Estado visual da subscrição — 'active' com cancelamento agendado é um estado
// próprio ("acesso até X"), não um "ativo" normal. O webhook grava o status
// Stripe cru: past_due/unpaid/incomplete são pagamento falhado e têm de ser
// visíveis, senão o ecrã parece normal a quem tem o cartão a ser recusado.
const PAYMENT_ISSUE_STATUSES = new Set(['past_due', 'unpaid', 'incomplete']);

const subscriptionBadge = (subscription) => {
  if (!subscription) return null;
  if (subscription.status === 'active' && (subscription.cancelAtPeriodEnd || subscription.cancelAt)) {
    return { key: 'cancelScheduled', variant: 'warning' };
  }
  if (PAYMENT_ISSUE_STATUSES.has(subscription.status)) {
    return { key: 'paymentIssue', variant: 'error' };
  }
  return {
    active: { key: 'active', variant: 'success' },
    paused: { key: 'paused', variant: 'warning' },
    canceled: { key: 'canceled', variant: 'error' },
  }[subscription.status] || null;
};

const CARD_ICONS = {
  visa: <SiVisa className="text-[#1A1F71] text-5xl" aria-hidden="true" />,
  mastercard: <SiMastercard className="text-[#EB001B] text-5xl" aria-hidden="true" />,
  amex: <SiAmericanexpress className="text-[#006FCF] text-5xl" aria-hidden="true" />,
  discover: <SiDiscover className="text-[#FF6000] text-5xl" aria-hidden="true" />,
};

const cardIcon = (brand) =>
  CARD_ICONS[brand?.toLowerCase()] || <FaCreditCard className="text-primary text-5xl" aria-hidden="true" />;

const purchaseStatus = (purchase) => {
  if (purchase.refundedAt) return { key: 'refunded', variant: 'error' };
  if (purchase.consumedByEventId) return { key: 'consumed', variant: 'neutral' };
  return { key: 'available', variant: 'success' };
};

const SubscriptionManagement = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const userId = useSelector((state) => state.user.user?.sub);
  const { data: subscription, isLoading: subscriptionLoading, isError: subscriptionError } =
    useGetMySubscriptionQuery(userId, { skip: !userId });
  const { data: paymentMethod } = useGetMyPaymentMethodQuery(userId, { skip: !userId });
  const { data: purchases = [], isLoading: purchasesLoading, isError: purchasesError } =
    useGetMyPlanPurchasesQuery(userId, { skip: !userId });
  const { data: accountAccess } = useGetAccountAccessQuery();
  const [createPortalSession, { isLoading: portalLoading }] =
    useCreateBillingPortalSessionMutation();

  // "Tem subscrição" = tem plano PAGO. O grátis também grava planKey desde o
  // modal pós-signup, e lê-lo como subscrição escondia o CTA de subscrever e
  // oferecia um portal de faturação que não existe (sem customer na Stripe).
  const hasSubscription = isPaidPlanKey(subscription?.planKey);
  const badge = hasSubscription ? subscriptionBadge(subscription) : null;
  const availablePurchases = purchases.filter((p) => !p.consumedByEventId && !p.refundedAt);
  // O portal precisa de um customer Stripe — só existe se alguma vez pagou.
  const hasStripeCustomer = hasSubscription || purchases.length > 0;

  const handleManageSubscription = useCallback(async () => {
    try {
      const result = await createPortalSession({ returnUrl: window.location.href }).unwrap();
      if (result?.success && result.sessionUrl) {
        setIsRedirecting(true);
        window.location.href = result.sessionUrl;
        return;
      }
      // O message da Lambda é essencial para debug (ex.: customer inexistente
      // no Stripe) — sem ele a recusa é indistinguível de qualquer outra.
      console.warn(t('subscription.error.billingPortal'), result?.message || '');
      dispatch(showToast({ message: t('subscription.error.billingPortal'), variant: 'error' }));
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      dispatch(showToast({ message: t('subscription.error.billingPortal'), variant: 'error' }));
    }
  }, [createPortalSession, dispatch, t]);

  if (subscriptionLoading || purchasesLoading) {
    return <Spinner status="loadingWithMessage" loadingMessage={t('subscription.loading.subscription')} />;
  }
  if (portalLoading) {
    return <Spinner status="loadingWithMessage" loadingMessage={t('subscription.loading.billingPortal')} />;
  }
  if (isRedirecting) {
    return <Spinner status="loadingWithMessage" loadingMessage={t('subscription.loading.redirecting')} />;
  }
  if (subscriptionError) {
    return <Spinner status="error" errorMessage={t('subscription.error.description')} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate__animated animate__fadeIn">
      <Text variant="h4" className="mb-4">{t('subscription.title')}</Text>

      <div className="grid md:grid-cols-2 gap-5">
      {/* Plano atual */}
      <Card elevated="sm" className="overflow-hidden">
        <div className="p-5">
          <div className={`-m-5 mb-4 p-4 ${
            badge?.variant === 'success' ? 'bg-success-50/50 dark:bg-primary-900/10' :
            badge?.variant === 'warning' ? 'bg-warning-50/50 dark:bg-warning-900/10' :
            badge?.variant === 'error' ? 'bg-error-50/50 dark:bg-error-900/10' :
            'bg-muted'
          }`}>
            <div className="flex justify-between items-center">
              <Text variant="h6" className="font-semibold text-foreground flex items-center">
                <FaStar className="text-primary-500/60 dark:text-primary-400/60 w-4 h-4 mr-2" aria-hidden="true" />
                {t('subscription.plan.title')}
              </Text>
              {badge && (
                <Badge variant={badge.variant} tone="soft" size="sm" className="font-medium">
                  {t(`subscription.status.${badge.key}`)}
                </Badge>
              )}
            </div>
          </div>

          {hasSubscription && subscription.status !== 'canceled' ? (
            <div>
              <Text variant="h5" className="font-medium mb-1">
                {t(`subscription.planNames.${subscription.planKey}`)}
              </Text>
              {subscription.billingCycle && (
                <Text variant="body2" className="text-muted-foreground mb-4">
                  {t(`billing:plans.billing.cycles.${subscription.billingCycle}`, subscription.billingCycle)}
                </Text>
              )}

              {badge?.key === 'active' && subscription.currentPeriodEnd && (
                <div className="p-3 bg-muted rounded-md mb-4">
                  <Text variant="body2">
                    {t('subscription.plan.renewsOn', { date: formatDateCompact(subscription.currentPeriodEnd) })}
                  </Text>
                </div>
              )}
              {badge?.key === 'cancelScheduled' && (
                <div className="p-3 bg-warning-50 dark:bg-warning-900/10 rounded-md mb-4">
                  <Text variant="body2" className="text-warning-700 dark:text-warning-300">
                    {t('billing:plans.policy.cancel.accessUntil', {
                      date: formatDateCompact(subscription.cancelAt || subscription.currentPeriodEnd),
                    })}
                  </Text>
                </div>
              )}
              {badge?.key === 'paused' && (
                <div className="p-3 bg-warning-50 dark:bg-warning-900/10 rounded-md mb-4">
                  <Text variant="body2" className="text-warning-700 dark:text-warning-300">
                    {t('subscription.plan.pausedDescription')}
                  </Text>
                </div>
              )}
              {badge?.key === 'paymentIssue' && (
                <div className="p-3 bg-error-50 dark:bg-error-900/10 rounded-md mb-4">
                  <Text variant="body2" className="text-error-700 dark:text-error-300">
                    {t('subscription.plan.paymentIssueDescription')}
                  </Text>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-border">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleManageSubscription}
                  endIcon={<FaExternalLinkAlt />}
                >
                  {t('subscription.plan.manageButton')}
                </Button>
                <Text variant="body2" className="text-muted-foreground text-center mt-3">
                  {t('subscription.portalHint')}
                </Text>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <FaStar className="text-muted-foreground text-2xl" />
              </div>
              <Text variant="h6" className="mb-2">
                {subscription?.status === 'canceled'
                  ? t('subscription.plan.canceledTitle')
                  : t('subscription.noPlan.title')}
              </Text>
              <Text variant="body2" className="text-muted-foreground mb-5">
                {subscription?.status === 'canceled'
                  ? t('subscription.plan.canceledDescription')
                  : accountAccess?.reason === 'STARTER_LIMIT_REACHED'
                    ? t('subscription.noPlan.starterUsed')
                    : t('subscription.noPlan.description')}
              </Text>
              <Button
                variant="primary"
                className="w-full"
                endIcon={<FaExchangeAlt />}
                onClick={() => navigate('/app/plan-selection')}
              >
                {t('subscription.plan.subscribe')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Método de pagamento (cartão em sync via webhook; alterações no portal) */}
      <Card elevated="sm" className="overflow-hidden">
        <div className="p-5">
          <div className="-m-5 mb-4 p-4 bg-muted">
            <Text variant="h6" className="font-semibold text-foreground flex items-center">
              <FaMoneyBill className="text-primary-500/60 dark:text-primary-400/60 w-4 h-4 mr-2" aria-hidden="true" />
              {t('subscription.payment.title')}
            </Text>
          </div>

          {paymentMethod?.brand ? (
            <div>
              <div className="flex items-start mb-5">
                <div className="mr-4 bg-muted p-3 rounded-lg">
                  {cardIcon(paymentMethod.brand)}
                </div>
                <div>
                  <Text variant="h6" className="mb-1.5">
                    **** **** **** {paymentMethod.last4}
                  </Text>
                  <Text variant="body2" className="text-muted-foreground">
                    <span className="font-medium">{t('subscription.payment.expiry')}:</span>{' '}
                    {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                  </Text>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  color="secondary"
                  className="w-full"
                  onClick={handleManageSubscription}
                  endIcon={<FaCreditCard />}
                >
                  {t('subscription.payment.updateButton')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <FaCreditCard className="text-muted-foreground text-2xl" />
              </div>
              <Text variant="h6" className="mb-2">{t('subscription.payment.noPaymentMethod')}</Text>
              <Text variant="body2" className="text-muted-foreground mb-5">
                {t('subscription.payment.noMethods')}
              </Text>
              {hasStripeCustomer && (
                <Button
                  variant="primary"
                  className="w-full"
                  endIcon={<FaPlus />}
                  onClick={handleManageSubscription}
                >
                  {t('subscription.payment.addMethod')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
      </div>

      {/* Compras Pay-per-event — erro nunca pode parecer "sem compras":
          quem tem um crédito por usar concluiria que a compra se perdeu. */}
      {purchasesError && (
        <div className="p-3 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-900/30">
          <Text variant="body2" className="text-error-700 dark:text-error-300">
            {t('subscription.purchases.error')}
          </Text>
        </div>
      )}
      {purchases.length > 0 && (
        <Card elevated="sm" className="overflow-hidden">
          <div className="p-5">
            <div className="-m-5 mb-4 p-4 bg-info-50/50 dark:bg-info-900/10">
              <Text variant="h6" className="font-semibold text-foreground flex items-center">
                <FaReceipt className="text-info-500/60 dark:text-info-400/60 w-4 h-4 mr-2" aria-hidden="true" />
                {t('subscription.purchases.title')}
              </Text>
            </div>

            {availablePurchases.length > 0 && (
              <div className="p-3 bg-success-50/50 dark:bg-success-900/10 rounded-md mb-4 flex items-center justify-between gap-3 flex-wrap">
                <Text variant="body2" className="text-success-700 dark:text-success-300 font-medium">
                  {t('subscription.purchases.available', { count: availablePurchases.length })}
                </Text>
                <Button
                  variant="primary"
                  size="sm"
                  endIcon={<FaPlus />}
                  onClick={() => navigate('/app/register-event')}
                >
                  {t('subscription.purchases.createEvent')}
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-sm">
                      {t('subscription.purchases.table.date')}
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground text-sm">
                      {t('subscription.purchases.table.amount')}
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground text-sm">
                      {t('subscription.purchases.table.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => {
                    const status = purchaseStatus(purchase);
                    return (
                      <tr key={purchase.id} className="border-b border-border">
                        <td className="py-3 text-sm text-muted-foreground">
                          {formatDateCompact(purchase.createdAt)}
                        </td>
                        <td className="py-3 text-sm font-medium">
                          {purchase.amount != null ? formatEUR(purchase.amount) : '—'}
                        </td>
                        <td className="py-3">
                          <Badge variant={status.variant} tone="soft" size="sm">
                            {t(`subscription.purchases.status.${status.key}`)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Acesso ao portal para quem tem histórico Stripe mas nenhuma subscrição ativa */}
      {!hasSubscription && hasStripeCustomer && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            startIcon={<FaExternalLinkAlt className="w-3.5 h-3.5" />}
          >
            {t('subscription.plan.manageButton')}
          </Button>
        </div>
      )}
    </div>
  );
};

SubscriptionManagement.displayName = 'SubscriptionManagement';

export default SubscriptionManagement;
