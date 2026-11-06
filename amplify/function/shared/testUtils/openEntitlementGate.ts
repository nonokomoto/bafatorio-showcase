/**
 * @file openEntitlementGate.ts
 * @description Factory de mock "gate de billing sempre aberto" para suites de
 * handlers gated cujo foco NÃO é o gate — o comportamento do gate tem testes
 * próprios em shared/entitlementGate.test.ts e nos handlers de gate.
 *
 * Uso (o path do jest.mock é relativo à suite; o requireActual daqui é
 * relativo a este ficheiro):
 *   jest.mock('../shared/entitlementGate', () =>
 *     require('../shared/testUtils/openEntitlementGate').openEntitlementGate()
 *   );
 */
export const openEntitlementGate = () => {
  const actual = jest.requireActual('../entitlementGate');
  const { PLANS } = jest.requireActual('../plans');
  return {
    ...actual,
    ensureEventWritable: jest.fn().mockResolvedValue({
      planKey: 'PRO',
      writable: true,
      reason: 'PRO_ACTIVE',
      entitlements: PLANS.PRO.entitlements,
      eventRecord: {},
    }),
  };
};
