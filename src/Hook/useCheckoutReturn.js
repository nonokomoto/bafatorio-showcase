import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readCheckoutReturn, CHECKOUT_MARKER_PARAMS } from '../Utils/checkoutReturn';
import { track } from '../Utils/analytics';

/**
 * Regresso da Stripe: o startCheckout marca o successUrl com
 * checkout=success&plan=...&tier=...&cycle=... — regista o evento, avisa o
 * caller (que fecha o onboarding) e expõe o estado do ecrã de sucesso. A
 * limpeza da query string evita que um refresh conte a compra duas vezes ou
 * reabra o modal.
 *
 * Avisar o caller aqui é o fix do loop pós-compra: o marcador de plano
 * pendente só era limpo quando a subscrição chegava, e o Por Evento nunca
 * cria uma (escreve em PlanPurchase) — o utilizador pagava e voltava a cair
 * no modal de escolha de plano.
 *
 * @param {() => void} onCheckoutReturn - chamado uma vez por regresso;
 *   precisa de identidade estável (useCallback) para o effect não repetir
 * @returns {{checkoutSuccess: Object|null, dismissCheckoutSuccess: () => void}}
 */
const useCheckoutReturn = (onCheckoutReturn) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  useEffect(() => {
    const checkoutReturn = readCheckoutReturn(searchParams);
    if (!checkoutReturn) return;
    track('checkout_completed', { plan: searchParams.get('plan') || 'unknown' });
    onCheckoutReturn();
    // Upgrade de escalão: o evento já existe, "cria o teu evento" não se aplica.
    if (!checkoutReturn.isTierUpgrade) setCheckoutSuccess(checkoutReturn);
    const next = new URLSearchParams(searchParams);
    CHECKOUT_MARKER_PARAMS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, onCheckoutReturn]);

  return { checkoutSuccess, dismissCheckoutSuccess: () => setCheckoutSuccess(null) };
};

export default useCheckoutReturn;
