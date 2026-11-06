import {
  PLANS,
  getEntitlement,
  resolvePlanKey,
  isPaidPlanKey,
  isEventWritable,
  LAUNCH_DISCOUNT,
  getDiscountedAmount,
  resolveTierForCount,
  getTierByKey,
  getTierUpgradeAmount,
} from '../plans';

describe('getEntitlement', () => {
  it('devolve os limites do Starter (matriz §2 do modelo canónico)', () => {
    expect(getEntitlement('STARTER', 'events')).toBe(1);
    expect(getEntitlement('STARTER', 'participants')).toBe(50);
    expect(getEntitlement('STARTER', 'suppliers')).toBe(10);
    expect(getEntitlement('STARTER', 'documents')).toBe(Infinity);
    expect(getEntitlement('STARTER', 'folders')).toBe(Infinity);
    expect(getEntitlement('STARTER', 'report')).toBe(false);
    expect(getEntitlement('STARTER', 'integrations')).toBe(false);
  });

  it('devolve nível pago para Pay-per-event e Pro (tudo ilimitado + PDF)', () => {
    expect(getEntitlement('PAY_PER_EVENT', 'events')).toBe(1);
    expect(getEntitlement('PAY_PER_EVENT', 'participants')).toBe(Infinity);
    expect(getEntitlement('PAY_PER_EVENT', 'report')).toBe(true);
    expect(getEntitlement('PRO', 'events')).toBe(Infinity);
    expect(getEntitlement('PRO', 'documents')).toBe(Infinity);
    expect(getEntitlement('PRO', 'report')).toBe(true);
    expect(getEntitlement('PAY_PER_EVENT', 'integrations')).toBe(true);
    expect(getEntitlement('PRO', 'integrations')).toBe(true);
  });

  it('fail closed: plano ou direito desconhecido devolve null', () => {
    expect(getEntitlement('Plano Organizador', 'participants')).toBe(null);
    expect(getEntitlement(undefined, 'participants')).toBe(null);
    expect(getEntitlement('PRO', 'advancedAnalytics')).toBe(null);
  });
});

describe('resolvePlanKey', () => {
  it('aceita chaves canónicas e rejeita nomes legados da DB (sem clientes pagantes, §8)', () => {
    expect(resolvePlanKey('PRO')).toBe('PRO');
    expect(resolvePlanKey('STARTER')).toBe('STARTER');
    expect(resolvePlanKey('PAY_PER_EVENT')).toBe('PAY_PER_EVENT');
    expect(resolvePlanKey('Plano Organizador')).toBe(null);
    expect(resolvePlanKey('Plano Flex')).toBe(null);
    expect(resolvePlanKey(null)).toBe(null);
    expect(resolvePlanKey(undefined)).toBe(null);
  });
});

describe('isPaidPlanKey', () => {
  it('separa o grátis dos planos pagos — ter planKey deixou de significar ser cliente', () => {
    expect(isPaidPlanKey('PRO')).toBe(true);
    expect(isPaidPlanKey('PAY_PER_EVENT')).toBe(true);
    // O modal pós-signup grava STARTER na UserSubscription: sem esta distinção,
    // o header mostrava "Pro" e a Settings escondia o CTA a quem é grátis.
    expect(isPaidPlanKey('STARTER')).toBe(false);
  });

  it('fecha para valores desconhecidos, legados e ausentes', () => {
    expect(isPaidPlanKey('ADMIN')).toBe(false);
    expect(isPaidPlanKey('Plano Organizador')).toBe(false);
    expect(isPaidPlanKey(null)).toBe(false);
    expect(isPaidPlanKey(undefined)).toBe(false);
  });
});

describe('escalões do Pay-per-event (ADR-038)', () => {
  describe('resolveTierForCount: escolhe o mais barato que cobre a lista', () => {
    it('lista pequena cai no escalão de entrada', () => {
      expect(resolveTierForCount(1).key).toBe('PPE_100');
      expect(resolveTierForCount(1).amount).toBe(999);
    });

    it('as fronteiras são inclusivas: 100 ainda é PPE_100, 101 já é PPE_200', () => {
      expect(resolveTierForCount(100).key).toBe('PPE_100');
      expect(resolveTierForCount(101).key).toBe('PPE_200');
      expect(resolveTierForCount(101).amount).toBe(1999);
    });

    it('acima de 200 vai para o escalão sem teto', () => {
      expect(resolveTierForCount(200).key).toBe('PPE_200');
      expect(resolveTierForCount(201).key).toBe('PPE_UNLIMITED');
      expect(resolveTierForCount(50000).amount).toBe(3499);
    });

    it('lista vazia ainda tem de poder comprar (evento novo, sem convidados)', () => {
      expect(resolveTierForCount(0).key).toBe('PPE_100');
    });
  });

  describe('getTierByKey: fail closed', () => {
    it('devolve o escalão pela chave', () => {
      expect(getTierByKey('PPE_200').maxParticipants).toBe(200);
      expect(getTierByKey('PPE_UNLIMITED').maxParticipants).toBe(Infinity);
    });

    it('chave desconhecida devolve null', () => {
      expect(getTierByKey('PPE_999')).toBe(null);
      expect(getTierByKey(undefined)).toBe(null);
    });
  });

  describe('getTierUpgradeAmount: cobra só a diferença (ADR-034)', () => {
    it('devolve a diferença entre os dois escalões', () => {
      expect(getTierUpgradeAmount('PPE_100', 'PPE_200')).toBe(1000);
      expect(getTierUpgradeAmount('PPE_100', 'PPE_UNLIMITED')).toBe(2500);
      expect(getTierUpgradeAmount('PPE_200', 'PPE_UNLIMITED')).toBe(1500);
    });

    it('não há downgrade de escalão nem upgrade para o mesmo', () => {
      expect(getTierUpgradeAmount('PPE_200', 'PPE_100')).toBe(null);
      expect(getTierUpgradeAmount('PPE_100', 'PPE_100')).toBe(null);
    });

    it('chave inválida de qualquer lado devolve null', () => {
      expect(getTierUpgradeAmount('PPE_999', 'PPE_200')).toBe(null);
      expect(getTierUpgradeAmount('PPE_100', null)).toBe(null);
    });
  });

  it('o cupão de lançamento deixa de tocar no Por Evento', () => {
    expect(LAUNCH_DISCOUNT.appliesTo).toEqual(['PRO']);
    expect(getDiscountedAmount('PAY_PER_EVENT', 999)).toBe(999);
    expect(getDiscountedAmount('PRO', 2999)).toBe(1499);
  });
});

describe('isEventWritable', () => {
  // Evento típico: criado há 2 meses, acaba daqui a 1 mês
  const base = {
    eventCreatedAt: '2026-05-11T10:00:00Z',
    eventEndDate: '2026-08-11T22:00:00Z',
    now: new Date('2026-07-11T12:00:00Z'),
  };

  it('Pro ativo edita sempre; Pro inativo fica read-only (aluguer, §4)', () => {
    expect(isEventWritable({ ...base, planKey: 'PRO', subscriptionActive: true })).toBe(true);
    expect(isEventWritable({ ...base, planKey: 'PRO', subscriptionActive: false })).toBe(false);
  });

  it('Pay-per-event/Starter: editável até 30 dias após o fim do evento, depois read-only', () => {
    // Evento acabou a 11/08; dia 29 pós-evento (10/09) ainda edita, dia 31 (11/09 23h) já não
    const posEvento = { eventCreatedAt: '2026-05-11T10:00:00Z', eventEndDate: '2026-08-11T22:00:00Z' };
    expect(isEventWritable({ ...posEvento, planKey: 'PAY_PER_EVENT', now: new Date('2026-09-10T22:00:00Z') })).toBe(true);
    expect(isEventWritable({ ...posEvento, planKey: 'PAY_PER_EVENT', now: new Date('2026-09-11T23:00:00Z') })).toBe(false);
    expect(isEventWritable({ ...posEvento, planKey: 'STARTER', now: new Date('2026-09-10T22:00:00Z') })).toBe(true);
    expect(isEventWritable({ ...posEvento, planKey: 'STARTER', now: new Date('2026-09-11T23:00:00Z') })).toBe(false);
  });

  it('teto de 14 meses desde a criação trava a manipulação da data do evento', () => {
    // Evento criado a 01/01/2026; data do evento empurrada para 2027 (reciclagem).
    // Teto: 01/03/2027. Antes do teto edita; depois, read-only mesmo com evento "futuro".
    const reciclado = { eventCreatedAt: '2026-01-01T00:00:00Z', eventEndDate: '2027-12-31T22:00:00Z' };
    expect(isEventWritable({ ...reciclado, planKey: 'PAY_PER_EVENT', now: new Date('2027-02-28T00:00:00Z') })).toBe(true);
    expect(isEventWritable({ ...reciclado, planKey: 'PAY_PER_EVENT', now: new Date('2027-03-02T00:00:00Z') })).toBe(false);
  });

  it('plano desconhecido ou legado nunca escreve (fail closed)', () => {
    expect(isEventWritable({ ...base, planKey: 'Plano Flex' })).toBe(false);
    expect(isEventWritable({ ...base, planKey: null })).toBe(false);
  });
});

describe('LAUNCH_DISCOUNT (cupão 50% nos dois planos pagos — Vision Core v1.8)', () => {
  it('define o cupão de lançamento só para o Pro (ADR-038)', () => {
    expect(LAUNCH_DISCOUNT).toEqual({ percentOff: 50, couponId: 'LAUNCH_50', appliesTo: ['PRO'] });
  });

  it('getDiscountedAmount aplica 50% ao Pro e devolve o valor base nos restantes', () => {
    expect(getDiscountedAmount('PRO', 2999)).toBe(1499); // 14,99 €/mês (floor de 1499,5)
    expect(getDiscountedAmount('PRO', 35988)).toBe(17994); // 179,94 €/ano (anual base = 12×mensal)
    expect(getDiscountedAmount('PAY_PER_EVENT', 999)).toBe(999); // saiu do cupão: cobra-se o escalão
    expect(getDiscountedAmount('STARTER', 0)).toBe(0);
  });
});

describe('preços base (decisão: anual = 12×mensal, sem desconto anual estrutural)', () => {
  it('Pro custa 29,99/mês e 359,88/ano; Por evento vai de 9,99 a 34,99 (ADR-038)', () => {
    expect(PLANS.PRO.prices.monthly.amount).toBe(2999);
    expect(PLANS.PRO.prices.annual.amount).toBe(35988);
    expect(PLANS.PAY_PER_EVENT.tiers.map((t) => t.amount)).toEqual([999, 1999, 3499]);
  });

  it('o escalão de entrada fica abaixo do preço real do Pro (ADR-038)', () => {
    // O topo é exceção deliberada; a entrada não pode ser. Se 9,99 subir acima
    // de 14,99, subscrever um mês e cancelar bate a compra em toda a escada.
    const proReal = getDiscountedAmount('PRO', PLANS.PRO.prices.monthly.amount);
    expect(proReal).toBe(1499);
    expect(PLANS.PAY_PER_EVENT.tiers[0].amount).toBeLessThan(proReal);
  });

  it('escalões estritamente crescentes em preço e em teto', () => {
    const tiers = PLANS.PAY_PER_EVENT.tiers;
    for (let i = 1; i < tiers.length; i += 1) {
      expect(tiers[i].amount).toBeGreaterThan(tiers[i - 1].amount);
      expect(tiers[i].maxParticipants).toBeGreaterThan(tiers[i - 1].maxParticipants);
    }
  });
});

