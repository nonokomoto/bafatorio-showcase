/**
 * Unit tests for the invalidate* helpers exported by roleApi/supplierApi/
 * participantApi (cross-slice invalidation contract — see ADR-039).
 * Each helper must build the exact tag shape its own slice's queries provide,
 * so callers in OTHER api slices never hand-roll it and risk a mismatch.
 */
jest.unmock('@reduxjs/toolkit');
jest.unmock('@reduxjs/toolkit/query/react');
jest.unmock('react-redux');

jest.mock('../../amplifyClient.js', () => ({
  getClient: jest.fn(),
  SELECTION_SETS: {},
}));

import { roleApi, invalidateEventRoles } from '../roleApi.js';
import { supplierApi, invalidateSupplierList } from '../supplierApi.js';
import { participantApi, invalidateParticipant } from '../participantApi.js';

describe('invalidateEventRoles', () => {
  test('dispatches the Role LIST tag for the given event', () => {
    const dispatch = jest.fn();
    invalidateEventRoles(dispatch, 'evt-1');
    expect(dispatch).toHaveBeenCalledWith(
      roleApi.util.invalidateTags([{ type: 'Role', id: 'LIST_evt-1' }])
    );
  });

  test('does nothing without an eventId', () => {
    const dispatch = jest.fn();
    invalidateEventRoles(dispatch, undefined);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('invalidateSupplierList', () => {
  test('dispatches the global Supplier LIST tag', () => {
    const dispatch = jest.fn();
    invalidateSupplierList(dispatch);
    expect(dispatch).toHaveBeenCalledWith(
      supplierApi.util.invalidateTags([{ type: 'Supplier', id: 'LIST' }])
    );
  });
});

describe('invalidateParticipant', () => {
  test('dispatches both the individual and the event LIST tags when both ids are given', () => {
    const dispatch = jest.fn();
    invalidateParticipant(dispatch, { participantId: 'p-1', eventId: 'evt-1' });
    expect(dispatch).toHaveBeenCalledWith(
      participantApi.util.invalidateTags([
        { type: 'Participant', id: 'p-1' },
        { type: 'Participant', id: 'LIST_evt-1' },
      ])
    );
  });

  test('dispatches only the participant tag when eventId is missing', () => {
    const dispatch = jest.fn();
    invalidateParticipant(dispatch, { participantId: 'p-1' });
    expect(dispatch).toHaveBeenCalledWith(
      participantApi.util.invalidateTags([{ type: 'Participant', id: 'p-1' }])
    );
  });

  test('does nothing without participantId or eventId', () => {
    const dispatch = jest.fn();
    invalidateParticipant(dispatch, {});
    expect(dispatch).not.toHaveBeenCalled();
  });
});
