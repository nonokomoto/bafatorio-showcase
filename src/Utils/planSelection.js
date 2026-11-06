/**
 * Chave sessionStorage que assinala "conta acabada de confirmar, decisão de
 * plano pendente". Marcada em SignUp.jsx (nos dois ramos: auto sign-in e o
 * fallback de sign-in manual) e lida em Layout.jsx — cobre a primeira entrada
 * na app seja qual for o caminho (auto sign-in ou SignIn manual).
 *
 * sessionStorage (não localStorage nem backend) de propósito: só precisa de
 * sobreviver ao redirect dentro do mesmo separador/sessão do browser; não
 * força contas antigas nem sessões noutro dispositivo, mantendo o âmbito
 * "só contas novas" sem tocar na stack de auth (Cognito post-confirmation
 * não pode escrever na tabela UserSubscription da stack de dados sem criar
 * uma dependência circular entre stacks).
 */
export const PLAN_SELECTION_PENDING_KEY = 'bafatorio:planSelectionPending';

export const markPlanSelectionPending = () => {
  try {
    sessionStorage.setItem(PLAN_SELECTION_PENDING_KEY, '1');
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — sem marcador, o
    // modal simplesmente não aparece, igual a uma conta antiga.
  }
};

export const clearPlanSelectionPending = () => {
  try {
    sessionStorage.removeItem(PLAN_SELECTION_PENDING_KEY);
  } catch {
    // ver nota acima
  }
};

export const isPlanSelectionPending = () => {
  try {
    return sessionStorage.getItem(PLAN_SELECTION_PENDING_KEY) === '1';
  } catch {
    return false;
  }
};
