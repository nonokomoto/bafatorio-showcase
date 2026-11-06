/**
 * deriveEventEntitlements — núcleo puro do gate por evento (§4/§4b do modelo canónico).
 *
 * O gate é por EVENTO, não por requester: resolve o plano do DONO e aplica-o
 * a qualquer ação no evento (colaboradores herdam o nível do dono).
 */
import { marshall } from '@aws-sdk/util-dynamodb';

import { deriveEventEntitlements, resolveEventEntitlements } from './resolveEventEntitlements';
import { PLANS } from './plans';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
  GetItemCommand: jest.fn((input) => ({ input })),
}));

const NOW = new Date('2026-07-12T12:00:00Z');

const starterEvent = {
  id: 'evt-1',
  owner: 'user-1::user-1',
  eventDateType: 'range',
  eventEndDate: '2026-08-01',
  createdAt: '2026-06-01T00:00:00Z',
};

const proSub = (status: string) => ({
  id: 'user-1',
  planName: 'PRO',
  status,
  currentPeriodEnd: '2026-08-01T00:00:00Z',
});

describe('deriveEventEntitlements', () => {
  describe('dono Pro (subscrição manda, §4)', () => {
    test('Pro active: escrita total, nível Pro', () => {
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: proSub('active'), now: NOW });
      expect(r).toEqual({
        planKey: 'PRO',
        entitlements: PLANS.PRO.entitlements,
        writable: true,
        reason: 'PRO_ACTIVE',
        eventRecord: starterEvent,
      });
    });

    test('Pro past_due mantém acesso durante o dunning (§4b)', () => {
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: proSub('past_due'), now: NOW });
      expect(r.writable).toBe(true);
      expect(r.reason).toBe('PRO_ACTIVE');
    });

    test('Pro paused: sem escrita, subscrição intacta (save offer §1)', () => {
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: proSub('paused'), now: NOW });
      expect(r.writable).toBe(false);
      expect(r.reason).toBe('PRO_PAUSED');
      expect(r.entitlements).toEqual(PLANS.PRO.entitlements);
    });

    test('Pro canceled + evento criado sob Pro: read-only com nível Pro (PDF mantém-se)', () => {
      const proEvent = { ...starterEvent, planKey: 'PRO' };
      const r = deriveEventEntitlements({ eventRecord: proEvent, ownerSubscription: proSub('canceled'), now: NOW });
      expect(r).toEqual({
        planKey: 'PRO',
        entitlements: PLANS.PRO.entitlements,
        writable: false,
        reason: 'PRO_LAPSED',
        eventRecord: proEvent,
      });
    });

    test('Pro unpaid + evento Starter: cai para o gate por janela do evento', () => {
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: proSub('unpaid'), now: NOW });
      expect(r.planKey).toBe('STARTER');
      expect(r.writable).toBe(true); // fim 2026-08-01 + 30d > NOW
      expect(r.reason).toBe('WITHIN_WINDOW');
    });
  });

  describe('dono ADMIN (ADR-036)', () => {
    const adminSub = { id: 'user-1', planName: 'ADMIN' }; // sem status — não há ciclo Stripe

    test('escrita total, nível Pro, mesmo com janela expirada', () => {
      const expiredEvent = {
        ...starterEvent,
        eventEndDate: '2026-01-01',
        createdAt: '2024-01-01T00:00:00Z',
      };
      const r = deriveEventEntitlements({ eventRecord: expiredEvent, ownerSubscription: adminSub, now: NOW });
      expect(r).toEqual({
        planKey: 'PRO',
        entitlements: PLANS.PRO.entitlements,
        writable: true,
        reason: 'ADMIN',
        eventRecord: expiredEvent,
      });
    });

    test('precede o snapshot do evento — evento Starter de dono ADMIN é writable', () => {
      const r = deriveEventEntitlements({
        eventRecord: { ...starterEvent, planKey: 'STARTER' },
        ownerSubscription: adminSub,
        now: NOW,
      });
      expect(r.writable).toBe(true);
      expect(r.reason).toBe('ADMIN');
    });
  });

  describe('evento Pay-per-event (janela §4)', () => {
    const ppeEvent = { ...starterEvent, planKey: 'PAY_PER_EVENT' };

    test('dentro da janela: escrita com nível pago', () => {
      const r = deriveEventEntitlements({ eventRecord: ppeEvent, ownerSubscription: null, now: NOW });
      expect(r).toEqual({
        planKey: 'PAY_PER_EVENT',
        entitlements: PLANS.PAY_PER_EVENT.entitlements,
        writable: true,
        reason: 'WITHIN_WINDOW',
        eventRecord: ppeEvent,
      });
    });

    test('fora da janela (fim+30d): read-only mas PDF/integrações mantêm-se', () => {
      const expired = { ...ppeEvent, eventEndDate: '2026-05-01' }; // +30d < NOW
      const r = deriveEventEntitlements({ eventRecord: expired, ownerSubscription: null, now: NOW });
      expect(r.writable).toBe(false);
      expect(r.reason).toBe('WINDOW_EXPIRED');
      expect(r.entitlements.report).toBe(true);
    });

    test('teto de 14 meses trava evento reciclado mesmo com fim no futuro', () => {
      const recycled = { ...ppeEvent, eventEndDate: '2099-01-01', createdAt: '2025-04-01T00:00:00Z' };
      const r = deriveEventEntitlements({ eventRecord: recycled, ownerSubscription: null, now: NOW });
      expect(r.writable).toBe(false);
      expect(r.reason).toBe('WINDOW_EXPIRED');
    });
  });

  describe('teto de participantes do escalão (ADR-038)', () => {
    const ppeEvent = { ...starterEvent, planKey: 'PAY_PER_EVENT' };

    test('sem participantLimit (compra anterior aos escalões): ilimitado', () => {
      const r = deriveEventEntitlements({ eventRecord: ppeEvent, ownerSubscription: null, now: NOW });
      expect(r.entitlements.participants).toBe(Infinity);
    });

    test('participantLimit 100 sobrepõe-se ao default do catálogo', () => {
      const r = deriveEventEntitlements({
        eventRecord: { ...ppeEvent, participantLimit: 100 },
        ownerSubscription: null,
        now: NOW,
      });
      expect(r.entitlements.participants).toBe(100);
    });

    test('o resto dos direitos continua a vir do plano', () => {
      const r = deriveEventEntitlements({
        eventRecord: { ...ppeEvent, participantLimit: 200 },
        ownerSubscription: null,
        now: NOW,
      });
      expect(r.entitlements).toEqual({ ...PLANS.PAY_PER_EVENT.entitlements, participants: 200 });
    });

    test('o teto acompanha o evento para lá da janela de escrita', () => {
      const expired = { ...ppeEvent, participantLimit: 100, eventEndDate: '2026-05-01' };
      const r = deriveEventEntitlements({ eventRecord: expired, ownerSubscription: null, now: NOW });
      expect(r.writable).toBe(false);
      expect(r.entitlements.participants).toBe(100);
    });

    test('Grátis ignora o campo — os tetos do catálogo é que mandam', () => {
      const r = deriveEventEntitlements({
        eventRecord: { ...starterEvent, participantLimit: 100 },
        ownerSubscription: null,
        now: NOW,
      });
      expect(r.entitlements).toEqual(PLANS.STARTER.entitlements);
    });

    test('subscrição Pro ativa ignora o teto congelado do evento', () => {
      const r = deriveEventEntitlements({
        eventRecord: { ...ppeEvent, participantLimit: 100 },
        ownerSubscription: proSub('active'),
        now: NOW,
      });
      expect(r.entitlements.participants).toBe(Infinity);
    });
  });

  describe('evento Starter (default §8)', () => {
    test('sem subscrição e sem planKey: nível Starter dentro da janela', () => {
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: null, now: NOW });
      expect(r).toEqual({
        planKey: 'STARTER',
        entitlements: PLANS.STARTER.entitlements,
        writable: true,
        reason: 'WITHIN_WINDOW',
        eventRecord: starterEvent,
      });
    });

    test('planName legado no registo de subscrição não dá acesso (§8)', () => {
      const legacySub = { id: 'user-1', planName: 'Plano Organizador', status: 'active' };
      const r = deriveEventEntitlements({ eventRecord: starterEvent, ownerSubscription: legacySub, now: NOW });
      expect(r.planKey).toBe('STARTER');
      expect(r.entitlements.report).toBe(false);
    });
  });

  describe('resolução da data de fim', () => {
    test('eventDateType specific usa a última data', () => {
      const specific = {
        ...starterEvent,
        eventDateType: 'specific',
        eventEndDate: undefined,
        eventSpecificDates: ['2026-03-01', '2026-06-20', '2026-05-01'],
      };
      // última data 2026-06-20 + 30d = 2026-07-20 > NOW → escrita
      const r = deriveEventEntitlements({ eventRecord: specific, ownerSubscription: null, now: NOW });
      expect(r.writable).toBe(true);
      expect(r.reason).toBe('WITHIN_WINDOW');
    });

    test('sem data de fim derivável: só o teto de 14 meses gateia', () => {
      const noDates = { ...starterEvent, eventEndDate: undefined, eventSpecificDates: [] };
      const r = deriveEventEntitlements({ eventRecord: noDates, ownerSubscription: null, now: NOW });
      expect(r.writable).toBe(true); // criado 2026-06-01, teto 2027-08-01 > NOW

      const old = { ...noDates, createdAt: '2025-04-01T00:00:00Z' };
      const r2 = deriveEventEntitlements({ eventRecord: old, ownerSubscription: null, now: NOW });
      expect(r2.writable).toBe(false);
      expect(r2.reason).toBe('WINDOW_EXPIRED');
    });
  });
});

describe('resolveEventEntitlements (wrapper DynamoDB)', () => {
  beforeEach(() => mockSend.mockReset());

  const call = () => resolveEventEntitlements({
    eventTableName: 'Event-tbl',
    subscriptionTableName: 'Sub-tbl',
    eventId: 'evt-1',
    now: NOW,
  });

  test('normaliza owner Gen 1 (userId::userId) na chave da subscrição', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: marshall(starterEvent) }) // Event (owner user-1::user-1)
      .mockResolvedValueOnce({ Item: marshall(proSub('active')) });
    const r = await call();
    expect(r.reason).toBe('PRO_ACTIVE');
    const subCall = mockSend.mock.calls[1][0];
    expect(subCall.input).toEqual({ TableName: 'Sub-tbl', Key: marshall({ id: 'user-1' }) });
  });

  test('sem registo de subscrição: gate por janela do evento (Starter)', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: marshall(starterEvent) })
      .mockResolvedValueOnce({ Item: undefined });
    const r = await call();
    expect(r.planKey).toBe('STARTER');
    expect(r.reason).toBe('WITHIN_WINDOW');
  });

  test('evento inexistente: fail fast', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });
    await expect(call()).rejects.toThrow('Event not found');
  });

  test('com eventRecord pré-carregado: só lê a subscrição (zero reads do Event)', async () => {
    mockSend.mockResolvedValueOnce({ Item: marshall(proSub('active')) }); // só a Sub
    const r = await resolveEventEntitlements({
      eventTableName: 'Event-tbl',
      subscriptionTableName: 'Sub-tbl',
      eventId: 'evt-1',
      eventRecord: starterEvent,
      now: NOW,
    });
    expect(r.reason).toBe('PRO_ACTIVE');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input.TableName).toBe('Sub-tbl');
  });
});
