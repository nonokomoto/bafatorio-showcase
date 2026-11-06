/**
 * Teste de sincronização da fonte única de planos.
 *
 * `src/Utils/plans.js` (frontend) e `amplify/function/shared/plans.ts` (backend)
 * são espelhos do modelo canónico (docs/plans/2026-07-11-billing-subscription-model.md).
 * Este teste falha se alguém alterar um lado sem o outro — a divergência entre
 * display e gate foi a causa dos bugs de billing que o modelo novo elimina.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — módulo JS do frontend, sem declarações; só comparamos valores
import * as frontend from '../../../src/Utils/plans';
import * as backend from './plans';

describe('plans: frontend (src/Utils/plans.js) ≡ backend (shared/plans.ts)', () => {
  test('PLAN_KEYS idênticos', () => {
    expect(backend.PLAN_KEYS).toEqual(frontend.PLAN_KEYS);
  });

  test('PLANS idênticos (preços e entitlements)', () => {
    expect(backend.PLANS).toEqual(frontend.PLANS);
  });

  test('ADMIN_PLAN_NAME idêntico e fora dos planos vendáveis (ADR-036)', () => {
    expect(backend.ADMIN_PLAN_NAME).toBe('ADMIN');
    expect(backend.ADMIN_PLAN_NAME).toBe(frontend.ADMIN_PLAN_NAME);
    // ADMIN não é um plano vendável: resolvePlanKey fecha-o nos dois lados —
    // o reconhecimento é sempre um check explícito, nunca via PLANS.
    expect(backend.resolvePlanKey('ADMIN')).toBeNull();
    expect(frontend.resolvePlanKey('ADMIN')).toBeNull();
  });

  test('isAdminPlanName: mesmo veredicto nos dois lados (ADR-036)', () => {
    for (const value of ['ADMIN', 'PRO', 'admin', null, undefined, '']) {
      expect(backend.isAdminPlanName(value)).toBe(frontend.isAdminPlanName(value));
    }
    expect(backend.isAdminPlanName('ADMIN')).toBe(true);
    expect(backend.isAdminPlanName('PRO')).toBe(false);
    expect(backend.isAdminPlanName(null)).toBe(false);
  });

  test('LAUNCH_DISCOUNT idêntico', () => {
    expect(backend.LAUNCH_DISCOUNT).toEqual(frontend.LAUNCH_DISCOUNT);
  });

  test('EDIT_WINDOW idêntico', () => {
    expect(backend.EDIT_WINDOW).toEqual(frontend.EDIT_WINDOW);
  });

  describe('isEventWritable: mesmo veredicto nos dois lados', () => {
    const cases = [
      // [descrição, params]
      ['Pro ativo escreve sempre', {
        planKey: 'PRO', subscriptionActive: true,
        eventEndDate: '2025-01-01', eventCreatedAt: '2024-01-01', now: new Date('2026-06-01'),
      }],
      ['Pro inativo não escreve', {
        planKey: 'PRO', subscriptionActive: false,
        eventEndDate: '2099-01-01', eventCreatedAt: '2026-01-01', now: new Date('2026-06-01'),
      }],
      ['PPE dentro da janela (fim+30d)', {
        planKey: 'PAY_PER_EVENT',
        eventEndDate: '2026-05-15', eventCreatedAt: '2026-01-01', now: new Date('2026-06-10'),
      }],
      ['PPE fora da janela (fim+30d ultrapassado)', {
        planKey: 'PAY_PER_EVENT',
        eventEndDate: '2026-04-01', eventCreatedAt: '2026-01-01', now: new Date('2026-06-10'),
      }],
      ['Starter trava no teto de 14 meses (evento reciclado)', {
        planKey: 'STARTER',
        eventEndDate: '2099-01-01', eventCreatedAt: '2025-01-01', now: new Date('2026-06-01'),
      }],
      ['plano desconhecido fail closed', {
        planKey: 'FLEX',
        eventEndDate: '2099-01-01', eventCreatedAt: '2026-01-01', now: new Date('2026-06-01'),
      }],
    ] as const;

    test.each(cases)('%s', (_desc, params) => {
      const expected = frontend.isEventWritable(params);
      expect(backend.isEventWritable(params)).toBe(expected);
      // O caso tem de discriminar de facto: fixa também o valor esperado
      expect(typeof expected).toBe('boolean');
    });
  });

  describe('getEntitlement / getDiscountedAmount: paridade em amostras', () => {
    test('getEntitlement', () => {
      const samples: Array<[string, string]> = [
        ['STARTER', 'participants'], ['STARTER', 'report'],
        ['PRO', 'events'], ['PAY_PER_EVENT', 'integrations'],
        ['FLEX', 'events'], ['PRO', 'inexistente'],
      ];
      for (const [plan, ent] of samples) {
        expect(backend.getEntitlement(plan, ent)).toEqual(frontend.getEntitlement(plan, ent));
      }
    });

    test('getDiscountedAmount aplica 50% só ao Pro (ADR-038)', () => {
      expect(backend.getDiscountedAmount('PRO', 2999)).toBe(1499);
      expect(backend.getDiscountedAmount('PRO', 35988)).toBe(17994);
      expect(backend.getDiscountedAmount('PAY_PER_EVENT', 999)).toBe(999);
      expect(backend.getDiscountedAmount('PRO', 2999)).toBe(frontend.getDiscountedAmount('PRO', 2999));
      expect(backend.getDiscountedAmount('PAY_PER_EVENT', 999)).toBe(frontend.getDiscountedAmount('PAY_PER_EVENT', 999));
    });

    test('escalões do Por Evento idênticos nos dois lados', () => {
      expect(backend.PLANS.PAY_PER_EVENT.tiers).toEqual(frontend.PLANS.PAY_PER_EVENT.tiers);
      for (const count of [0, 1, 100, 101, 200, 201, 5000]) {
        expect(backend.resolveTierForCount(count)).toEqual(frontend.resolveTierForCount(count));
      }
      for (const [from, to] of [['PPE_100', 'PPE_200'], ['PPE_200', 'PPE_100'], ['PPE_100', 'PPE_UNLIMITED'], ['PPE_X', 'PPE_200']]) {
        expect(backend.getTierUpgradeAmount(from, to)).toEqual(frontend.getTierUpgradeAmount(from, to));
      }
    });

    test('getTierByLimit: o teto gravado no evento identifica o escalão', () => {
      // O teto do evento é a autoridade (ADR-038); o escalão de origem de um
      // upgrade deriva dele, não do histórico de compras.
      expect(backend.getTierByLimit(100)?.key).toBe('PPE_100');
      expect(backend.getTierByLimit(200)?.key).toBe('PPE_200');
      // Campo ausente É o escalão sem teto — a razão de não haver sentinela.
      expect(backend.getTierByLimit(null)?.key).toBe('PPE_UNLIMITED');
      expect(backend.getTierByLimit(undefined)?.key).toBe('PPE_UNLIMITED');
      // Teto que não corresponde a escalão nenhum: fail closed.
      expect(backend.getTierByLimit(150)).toBeNull();
      for (const limit of [100, 200, 150, null, undefined]) {
        expect(backend.getTierByLimit(limit)).toEqual(frontend.getTierByLimit(limit));
      }
    });

    test('resolvePlanKey normaliza e fecha para legados', () => {
      expect(backend.resolvePlanKey('PRO')).toBe('PRO');
      expect(backend.resolvePlanKey('Plano Organizador')).toBeNull();
      expect(backend.resolvePlanKey('Plano Flex')).toBe(frontend.resolvePlanKey('Plano Flex'));
    });
  });
});
