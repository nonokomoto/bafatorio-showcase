/**
 * createDependent/updateDependent/deleteDependent alteram o dependentsCount
 * cacheado no participantApi (slice separado do dependentApi) sem passar por
 * nenhuma mutation desse slice. Regressão para garantir a invalidação cruzada
 * do participante afetado — ver ADR-039.
 */
jest.unmock('@reduxjs/toolkit');
jest.unmock('@reduxjs/toolkit/query/react');
jest.unmock('react-redux');

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../amplifyClient.js', () => ({
  getClient: jest.fn(),
  SELECTION_SETS: {},
}));

jest.mock('../participantApi.js', () => ({
  invalidateParticipant: jest.fn(),
}));

import { getClient } from '../../amplifyClient.js';
import { dependentApi } from '../dependentsApi.js';
import { invalidateParticipant } from '../participantApi.js';

const buildStore = () =>
  configureStore({
    reducer: { [dependentApi.reducerPath]: dependentApi.reducer },
    middleware: (getDefault) => getDefault().concat(dependentApi.middleware),
  });

describe('dependentApi — invalidação cruzada do participantApi', () => {
  beforeEach(() => {
    invalidateParticipant.mockClear();
  });

  test('createDependent: invalida o participante afetado', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: { createDependentCustom: { id: 'd-1', name: 'Filho', participantId: 'p-1', eventId: 'evt-1' } },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(
        dependentApi.endpoints.createDependent.initiate({
          name: 'Filho', age: 'CHILD', participantId: 'p-1', eventId: 'evt-1', status: 'REGISTERED',
        })
      )
      .unwrap();

    expect(invalidateParticipant).toHaveBeenCalledWith(expect.any(Function), {
      participantId: 'p-1',
      eventId: 'evt-1',
    });
  });

  test('updateDependent: invalida o participante afetado', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: { updateDependentCustom: { id: 'd-1', name: 'Filho Atualizado' } },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(
        dependentApi.endpoints.updateDependent.initiate({
          id: 'd-1', name: 'Filho Atualizado', participantId: 'p-1', eventId: 'evt-1',
        })
      )
      .unwrap();

    expect(invalidateParticipant).toHaveBeenCalledWith(expect.any(Function), {
      participantId: 'p-1',
      eventId: 'evt-1',
    });
  });

  test('deleteDependent: invalida o participante afetado', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: { deleteDependentCustom: { id: 'd-1', success: true } },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(
        dependentApi.endpoints.deleteDependent.initiate({
          id: 'd-1', participantId: 'p-1', eventId: 'evt-1',
        })
      )
      .unwrap();

    expect(invalidateParticipant).toHaveBeenCalledWith(expect.any(Function), {
      participantId: 'p-1',
      eventId: 'evt-1',
    });
  });

  test('erro GraphQL: não invalida nada', async () => {
    const graphql = jest.fn().mockRejectedValue(new Error('network error'));
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await expect(
      store
        .dispatch(
          dependentApi.endpoints.createDependent.initiate({
            name: 'Filho', age: 'CHILD', participantId: 'p-1', eventId: 'evt-1', status: 'REGISTERED',
          })
        )
        .unwrap()
    ).rejects.toBeTruthy();

    expect(invalidateParticipant).not.toHaveBeenCalled();
  });
});
