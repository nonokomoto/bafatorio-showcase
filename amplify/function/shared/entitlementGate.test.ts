/**
 * entitlementGate — camada fina de imposição sobre as funções de decisão.
 * Contrato de recusa uniforme: erro com prefixo BILLING_GATE:<REASON>.
 */
import {
  ensureEventWritable,
  ensureWithinLimit,
  ensureIntegrationsAllowed,
  isBillingGateError,
  billingGateMessage,
  BILLING_GATE_PREFIX,
} from './entitlementGate';
import { PLANS } from './plans';

const mockResolve = jest.fn();
jest.mock('./resolveEventEntitlements', () => ({
  resolveEventEntitlements: (...args: unknown[]) => mockResolve(...args),
}));

const GATE_ARGS = {
  eventTableName: 'Event-tbl',
  subscriptionTableName: 'Sub-tbl',
  eventId: 'evt-1',
};

describe('ensureEventWritable', () => {
  beforeEach(() => mockResolve.mockReset());

  test('evento writable: devolve o resultado resolvido intacto', async () => {
    const resolved = {
      planKey: 'PRO',
      entitlements: PLANS.PRO.entitlements,
      writable: true,
      reason: 'PRO_ACTIVE',
    };
    mockResolve.mockResolvedValueOnce(resolved);
    await expect(ensureEventWritable(GATE_ARGS)).resolves.toBe(resolved);
    expect(mockResolve).toHaveBeenCalledWith(GATE_ARGS);
  });

  test.each(['WINDOW_EXPIRED', 'PRO_PAUSED', 'PRO_LAPSED'] as const)(
    'não-writable com reason %s: lança BILLING_GATE:%s',
    async (reason) => {
      mockResolve.mockResolvedValueOnce({
        planKey: 'STARTER',
        entitlements: PLANS.STARTER.entitlements,
        writable: false,
        reason,
      });
      await expect(ensureEventWritable(GATE_ARGS)).rejects.toThrow(`BILLING_GATE:${reason}`);
    }
  );
});

describe('ensureWithinLimit', () => {
  const starter = PLANS.STARTER.entitlements;

  test('50.º participante passa (49 existentes + 1)', () => {
    expect(() => ensureWithinLimit(starter, 'participants', 49)).not.toThrow();
  });

  test('51.º participante recusa com LIMIT_PARTICIPANTS', () => {
    expect(() => ensureWithinLimit(starter, 'participants', 50)).toThrow(
      'BILLING_GATE:LIMIT_PARTICIPANTS'
    );
  });

  test('import em lote que estoura o limite recusa (45 existentes + 6)', () => {
    expect(() => ensureWithinLimit(starter, 'participants', 45, 6)).toThrow(
      'BILLING_GATE:LIMIT_PARTICIPANTS'
    );
  });

  test('import em lote exatamente no limite passa (45 existentes + 5)', () => {
    expect(() => ensureWithinLimit(starter, 'participants', 45, 5)).not.toThrow();
  });

  test('limite por chave: suppliers gera o reason próprio', () => {
    expect(() => ensureWithinLimit(starter, 'suppliers', 10)).toThrow(
      'BILLING_GATE:LIMIT_SUPPLIERS'
    );
  });

  // Documentos e pastas saíram do gate do Starter — ilimitados como no nível pago.
  test('documentos e pastas não limitam no Starter', () => {
    expect(() => ensureWithinLimit(starter, 'folders', 500)).not.toThrow();
    expect(() => ensureWithinLimit(starter, 'documents', 10_000, 50)).not.toThrow();
  });

  test('Infinity (nível pago) passa sempre', () => {
    expect(() =>
      ensureWithinLimit(PLANS.PRO.entitlements, 'participants', 1_000_000, 500)
    ).not.toThrow();
  });
});

describe('ensureIntegrationsAllowed', () => {
  test('Starter (integrations: false) recusa com NO_INTEGRATIONS', () => {
    expect(() => ensureIntegrationsAllowed(PLANS.STARTER.entitlements)).toThrow(
      'BILLING_GATE:NO_INTEGRATIONS'
    );
  });

  test('nível pago passa', () => {
    expect(() => ensureIntegrationsAllowed(PLANS.PAY_PER_EVENT.entitlements)).not.toThrow();
  });
});

describe('billingGateMessage', () => {
  test('erro do gate: devolve a message para o handler embutir no resultado tipado', () => {
    expect(billingGateMessage(new Error('BILLING_GATE:LIMIT_SUPPLIERS'))).toBe(
      'BILLING_GATE:LIMIT_SUPPLIERS'
    );
  });

  test('erro que não é do gate: relança (fail fast, nunca vira success:false)', () => {
    const boom = new Error('Event not found');
    expect(() => billingGateMessage(boom)).toThrow(boom);
  });
});

describe('isBillingGateError', () => {
  test('reconhece erros do gate e ignora os restantes', () => {
    expect(isBillingGateError(new Error(`${BILLING_GATE_PREFIX}WINDOW_EXPIRED`))).toBe(true);
    expect(isBillingGateError(new Error('Event not found'))).toBe(false);
    expect(isBillingGateError('not-an-error')).toBe(false);
  });
});
