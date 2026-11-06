/**
 * uploadParticipants cria roles novas (upload-participant Lambda,
 * resolveRoleId) diretamente na DynamoDB, sem passar pelo roleApi. Regressão
 * para garantir que a cache de roles é invalidada no slice certo após um
 * import bem-sucedido — ver ADR-039.
 */
jest.unmock('@reduxjs/toolkit');
jest.unmock('@reduxjs/toolkit/query/react');
jest.unmock('react-redux');

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../amplifyClient.js', () => ({
  getClient: jest.fn(),
  SELECTION_SETS: {},
}));

jest.mock('../roleApi.js', () => ({
  invalidateEventRoles: jest.fn(),
}));

import { getClient } from '../../amplifyClient.js';
import { participantApi } from '../participantApi';
import { invalidateEventRoles } from '../roleApi.js';

const buildStore = () =>
  configureStore({
    reducer: { [participantApi.reducerPath]: participantApi.reducer },
    middleware: (getDefault) => getDefault().concat(participantApi.middleware),
  });

describe('uploadParticipants — invalidação cruzada do roleApi', () => {
  beforeEach(() => {
    invalidateEventRoles.mockClear();
  });

  test('sucesso: invalida a lista de roles do evento importado', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: {
        uploadParticipants: {
          success: true,
          details: { participantsCount: 2, dependentsCount: 0, skippedCount: 0 },
        },
      },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(participantApi.endpoints.uploadParticipants.initiate({ file: 'base64', eventId: 'evt-1' }))
      .unwrap();

    expect(invalidateEventRoles).toHaveBeenCalledWith(expect.any(Function), 'evt-1');
  });

  test('success:false no payload: não invalida nada', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: { uploadParticipants: { success: false, message: 'erro de validação' } },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(participantApi.endpoints.uploadParticipants.initiate({ file: 'base64', eventId: 'evt-1' }))
      .unwrap();

    expect(invalidateEventRoles).not.toHaveBeenCalled();
  });

  test('erro GraphQL: não invalida nada', async () => {
    const graphql = jest.fn().mockRejectedValue(new Error('network error'));
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await expect(
      store
        .dispatch(participantApi.endpoints.uploadParticipants.initiate({ file: 'base64', eventId: 'evt-1' }))
        .unwrap()
    ).rejects.toBeTruthy();

    expect(invalidateEventRoles).not.toHaveBeenCalled();
  });
});
