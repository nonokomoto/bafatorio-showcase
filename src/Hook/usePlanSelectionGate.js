import { useState, useEffect, useCallback } from 'react';
import { useGetMySubscriptionQuery } from '../Api/services/billingApi';
import { isPlanSelectionPending, clearPlanSelectionPending } from '../Utils/planSelection';

/**
 * Modal obrigatório de escolha de plano: só consulta a subscrição quando a
 * conta tem a flag "acabou de se registar" (SignUp.jsx) — contas antigas
 * nunca pagam este pedido extra. `data === null` (não `undefined`) é o
 * sinal de "confirmado, sem plano" — evita mostrar o modal a piscar
 * enquanto a query ainda está a carregar.
 *
 * O marcador é estado, não uma leitura direta do sessionStorage: limpá-lo não
 * provoca render, e sem isso o fecho do modal ficava dependente de a query
 * trazer uma subscrição — que no plano grátis nunca chega. Quem fecha o modal
 * é a decisão do utilizador.
 *
 * @param {string|undefined} userId
 * @returns {{showPlanSelectionModal: boolean, handlePlanDecided: () => void}}
 */
const usePlanSelectionGate = (userId) => {
  const [planSelectionPending, setPlanSelectionPending] = useState(isPlanSelectionPending);
  const requiresPlanSelection = Boolean(userId) && planSelectionPending;
  const { data: subscription } = useGetMySubscriptionQuery(userId, {
    skip: !requiresPlanSelection,
  });

  const handlePlanDecided = useCallback(() => {
    clearPlanSelectionPending();
    setPlanSelectionPending(false);
  }, []);

  // A conta já tem plano (pagou noutro separador, ou o webhook chegou primeiro):
  // a decisão deixou de fazer sentido, por isso o marcador sai também aqui —
  // senão ficava preso na sessão a manter esta query viva sem razão.
  useEffect(() => {
    if (planSelectionPending && subscription) handlePlanDecided();
  }, [planSelectionPending, subscription, handlePlanDecided]);

  return {
    showPlanSelectionModal: requiresPlanSelection && subscription === null,
    handlePlanDecided,
  };
};

export default usePlanSelectionGate;
