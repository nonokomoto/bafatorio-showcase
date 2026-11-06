/**
 * @file budgetHealth.js
 * @description Cálculo do estado do orçamento do evento — origem única partilhada
 * entre o EventDetailsCard (secção financeira) e o FinancialSummary.
 *
 * As despesas vêm exclusivamente dos fornecedores (ver eventSupplierApi):
 * selecionar um fornecedor incrementa `committedExpenses`; pagá-lo move o valor
 * para `effectiveExpenses`. Disponível = orçamento − (comprometidas + efetivas).
 */

const toNumber = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

/**
 * Limiar de saúde do orçamento pela percentagem utilizada (interno).
 * @param {number} usedPercent
 * @returns {'healthy'|'caution'|'critical'}
 */
const getHealthStatus = (usedPercent) => {
  if (usedPercent <= 60) return 'healthy';
  if (usedPercent <= 85) return 'caution';
  return 'critical';
};

/**
 * @param {{ budget?: number, effectiveExpenses?: number, committedExpenses?: number }} params
 * @returns {{ usedTotal: number, budgetAvailable: number, usedPercent: number,
 *             health: 'healthy'|'caution'|'critical', hasBudget: boolean }}
 */
export const getBudgetHealth = ({ budget, effectiveExpenses, committedExpenses } = {}) => {
  const total = toNumber(budget);
  const used = toNumber(effectiveExpenses) + toNumber(committedExpenses);
  const usedPercent = total > 0 ? (used / total) * 100 : 0;

  return {
    usedTotal: used,
    budgetAvailable: total - used,
    usedPercent,
    health: getHealthStatus(usedPercent),
    hasBudget: total > 0,
  };
};
