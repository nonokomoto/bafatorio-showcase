import { getBudgetHealth } from '../budgetHealth';

describe('getBudgetHealth', () => {
  it('calcula usado, disponível e percentagem a partir de orçamento e despesas', () => {
    const r = getBudgetHealth({ budget: 45000, committedExpenses: 28400, effectiveExpenses: 0 });
    expect(r.usedTotal).toBe(28400);
    expect(r.budgetAvailable).toBe(16600);
    expect(r.usedPercent).toBeCloseTo(63.111, 2);
    expect(r.hasBudget).toBe(true);
  });

  it('soma efetivas + comprometidas no total usado', () => {
    const r = getBudgetHealth({ budget: 100, effectiveExpenses: 30, committedExpenses: 30 });
    expect(r.usedTotal).toBe(60);
    expect(r.budgetAvailable).toBe(40);
    expect(r.usedPercent).toBe(60);
  });

  it('classifica saúde: healthy no limite de 60%', () => {
    expect(getBudgetHealth({ budget: 100, effectiveExpenses: 60, committedExpenses: 0 }).health).toBe('healthy');
  });

  it('classifica saúde: caution acima de 60% até 85%', () => {
    expect(getBudgetHealth({ budget: 100, effectiveExpenses: 85, committedExpenses: 0 }).health).toBe('caution');
  });

  it('classifica saúde: critical acima de 85%', () => {
    expect(getBudgetHealth({ budget: 100, effectiveExpenses: 90, committedExpenses: 0 }).health).toBe('critical');
  });

  it('trata valores em falta como 0', () => {
    const r = getBudgetHealth({ budget: 100 });
    expect(r.usedTotal).toBe(0);
    expect(r.budgetAvailable).toBe(100);
    expect(r.usedPercent).toBe(0);
    expect(r.health).toBe('healthy');
  });

  it('sem orçamento: hasBudget false e percentagem 0 (sem divisão por zero)', () => {
    const r = getBudgetHealth({ budget: 0, effectiveExpenses: 50, committedExpenses: 20 });
    expect(r.hasBudget).toBe(false);
    expect(r.usedPercent).toBe(0);
    expect(r.usedTotal).toBe(70);
  });

  it('trata orçamento não numérico como ausente', () => {
    const r = getBudgetHealth({ budget: null, effectiveExpenses: 10, committedExpenses: 5 });
    expect(r.hasBudget).toBe(false);
    expect(r.usedPercent).toBe(0);
  });
});
