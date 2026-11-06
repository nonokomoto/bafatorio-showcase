/**
 * useAuthz — gate cosmético fail-open: sem `access` do backend (a carregar,
 * query skipped, backend da fase 1 do deploy) NADA é trancado; os locks só
 * aparecem com access presente. A autoridade real é a Lambda (§4b).
 */
import { renderHook } from '@testing-library/react';

jest.mock('../../Api/services/collaboratorApi', () => ({
  useGetEventAsCollaboratorQuery: jest.fn(),
}));

import { useGetEventAsCollaboratorQuery } from '../../Api/services/collaboratorApi';
import {
  useAuthz,
  isBillingGateMessage,
  billingGateReason,
  billingGateReasonFromError,
  billingGateErrorKey,
} from '../useAuthz';
import { PLANS } from '../../Utils/plans';

const mockQuery = (data, isLoading = false) =>
  useGetEventAsCollaboratorQuery.mockReturnValue({ data, isLoading });

describe('useAuthz', () => {
  test('sem access (a carregar / backend antigo): nenhum lock cosmético', () => {
    mockQuery({ event: { id: 'evt-1' }, userRole: 'OWNER' }); // resposta sem access
    const { result } = renderHook(() => useAuthz('evt-1'));

    expect(result.current.writable).toBe(true);
    expect(result.current.entitlements.report).toBe(true);
    expect(result.current.entitlements.integrations).toBe(true);
    expect(result.current.limit('participants', 30).reached).toBe(false);
    expect(result.current.planKey).toBeNull();
  });

  test('com access STARTER: limites e features do plano aplicam-se', () => {
    mockQuery({
      event: { id: 'evt-1' },
      access: { planKey: 'STARTER', writable: true, reason: 'WITHIN_WINDOW' },
    });
    const { result } = renderHook(() => useAuthz('evt-1'));

    expect(result.current.planKey).toBe('STARTER');
    expect(result.current.entitlements).toEqual(PLANS.STARTER.entitlements);
    expect(result.current.limit('participants', 49)).toEqual({
      max: 50, remaining: 1, reached: false, approaching: false,
    });
    expect(result.current.limit('participants', 50).reached).toBe(true);
    // Documentos e pastas saíram do gate: sem teto mesmo no Grátis.
    expect(result.current.limit('folders', 99)).toEqual({
      max: Infinity, remaining: Infinity, reached: false, approaching: false,
    });
  });

  test('com access não-writable: writable false e reason exposto', () => {
    mockQuery({
      event: { id: 'evt-1' },
      access: { planKey: 'PRO', writable: false, reason: 'PRO_PAUSED' },
    });
    const { result } = renderHook(() => useAuthz('evt-1'));

    expect(result.current.writable).toBe(false);
    expect(result.current.reason).toBe('PRO_PAUSED');
    expect(result.current.entitlements).toEqual(PLANS.PRO.entitlements);
  });

  test('participantLimit do backend sobrepõe-se ao teto do catálogo (ADR-038)', () => {
    mockQuery({
      event: { id: 'evt-1' },
      access: { planKey: 'PAY_PER_EVENT', writable: true, reason: 'WITHIN_WINDOW', participantLimit: 100 },
    });
    const { result } = renderHook(() => useAuthz('evt-1'));

    expect(result.current.limit('participants', 99)).toEqual({
      max: 100, remaining: 1, reached: false, approaching: true,
    });
    expect(result.current.limit('participants', 100).reached).toBe(true);
    // O resto continua a vir do plano.
    expect(result.current.entitlements).toEqual({
      ...PLANS.PAY_PER_EVENT.entitlements,
      participants: 100,
    });
  });

  describe('aviso aos 80% (só no escalão pago)', () => {
    const ppe = (participantLimit) => ({
      event: { id: 'evt-1' },
      access: { planKey: 'PAY_PER_EVENT', writable: true, reason: 'WITHIN_WINDOW', participantLimit },
    });

    test('abaixo dos 80% não avisa', () => {
      mockQuery(ppe(100));
      const { result } = renderHook(() => useAuthz('evt-1'));
      expect(result.current.limit('participants', 79).approaching).toBe(false);
    });

    test('a partir dos 80% avisa, antes de bloquear', () => {
      mockQuery(ppe(100));
      const { result } = renderHook(() => useAuthz('evt-1'));
      expect(result.current.limit('participants', 80).approaching).toBe(true);
      expect(result.current.limit('participants', 80).reached).toBe(false);
    });

    test('já bloqueado deixa de estar "a aproximar-se"', () => {
      mockQuery(ppe(100));
      const { result } = renderHook(() => useAuthz('evt-1'));
      expect(result.current.limit('participants', 100)).toEqual({
        max: 100, remaining: 0, reached: true, approaching: false,
      });
    });

    test('o Grátis não avisa: bloqueio duro é o correto no plano gratuito', () => {
      mockQuery({
        event: { id: 'evt-1' },
        access: { planKey: 'STARTER', writable: true, reason: 'WITHIN_WINDOW', participantLimit: 50 },
      });
      const { result } = renderHook(() => useAuthz('evt-1'));
      expect(result.current.limit('participants', 45).approaching).toBe(false);
    });

    test('sem teto não há aviso nenhum', () => {
      mockQuery(ppe(undefined));
      const { result } = renderHook(() => useAuthz('evt-1'));
      expect(result.current.limit('participants', 9999).approaching).toBe(false);
    });
  });

  test('Por Evento sem participantLimit (compra anterior aos escalões): ilimitado', () => {
    mockQuery({
      event: { id: 'evt-1' },
      access: { planKey: 'PAY_PER_EVENT', writable: true, reason: 'WITHIN_WINDOW' },
    });
    const { result } = renderHook(() => useAuthz('evt-1'));
    expect(result.current.limit('participants', 5000).reached).toBe(false);
  });

  test('planKey desconhecido do backend não rebenta: trata como sem access (fail-open)', () => {
    mockQuery({
      event: { id: 'evt-1' },
      access: { planKey: 'FUTURE_PLAN', writable: true, reason: 'X' },
    });
    const { result } = renderHook(() => useAuthz('evt-1'));
    expect(result.current.entitlements.report).toBe(true);
    expect(result.current.limit('participants', 999).reached).toBe(false);
  });
});

describe('helpers do contrato BILLING_GATE', () => {
  test('isBillingGateMessage / billingGateReason', () => {
    expect(isBillingGateMessage('BILLING_GATE:WINDOW_EXPIRED')).toBe(true);
    expect(billingGateReason('BILLING_GATE:WINDOW_EXPIRED')).toBe('WINDOW_EXPIRED');
    expect(isBillingGateMessage('FORBIDDEN')).toBe(false);
    expect(billingGateReason('FORBIDDEN')).toBeNull();
  });

  test('billingGateReasonFromError: Error direto (unwrap de handler que lança)', () => {
    expect(billingGateReasonFromError(new Error('BILLING_GATE:WINDOW_EXPIRED'))).toBe('WINDOW_EXPIRED');
  });

  test('billingGateReasonFromError: erro RTK do baseQuery com GraphQLResult em data.errors', () => {
    const rtkError = {
      status: 'GRAPHQL_ERROR',
      message: undefined,
      data: { errors: [{ message: 'BILLING_GATE:PRO_LAPSED' }] },
    };
    expect(billingGateReasonFromError(rtkError)).toBe('PRO_LAPSED');
  });

  test('billingGateReasonFromError: reason embrulhado noutra mensagem', () => {
    expect(
      billingGateReasonFromError({ message: 'GraphQL error: BILLING_GATE:LIMIT_SUPPLIERS' })
    ).toBe('LIMIT_SUPPLIERS');
  });

  test('billingGateErrorKey: recusa do gate vira chave de copy própria', () => {
    // Usado pelo FidelizeSyncModal: sem isto o utilizador via
    // "BILLING_GATE:LIMIT_PARTICIPANTS" em cru no ecrã.
    expect(billingGateErrorKey(new Error('BILLING_GATE:LIMIT_PARTICIPANTS'), 'x'))
      .toBe('common:billingGate.LIMIT_PARTICIPANTS');
  });

  test('billingGateErrorKey: reason sem copy própria cai no genérico', () => {
    expect(billingGateErrorKey(new Error('BILLING_GATE:NO_INTEGRATIONS'), 'x'))
      .toBe('common:billingGate.generic');
  });

  test('billingGateErrorKey: erro comum devolve o fallback (null inclusive)', () => {
    expect(billingGateErrorKey(new Error('boom'), 'erro.generico')).toBe('erro.generico');
    // O modal passa null para distinguir "não é do gate" e usar a mensagem crua.
    expect(billingGateErrorKey(new Error('boom'), null)).toBeNull();
  });

  test('billingGateReasonFromError: erros que não são do gate devolvem null', () => {
    expect(billingGateReasonFromError({ message: 'FORBIDDEN' })).toBeNull();
    expect(billingGateReasonFromError({ data: { errors: [{ message: 'Network error' }] } })).toBeNull();
    expect(billingGateReasonFromError(null)).toBeNull();
    expect(billingGateReasonFromError(undefined)).toBeNull();
  });
});
