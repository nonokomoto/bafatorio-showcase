/**
 * amplifyBaseQuery do participantApi — contrato de erro.
 *
 * O Amplify v6 lança um GraphQLResult {data, errors} quando a resposta tem
 * erros GraphQL. Falha TOTAL (todos os campos top-level a null — ex.: mutation
 * recusada pelo gate de billing) tem de REJEITAR para o unwrap() rejeitar;
 * só respostas com dados utilizáveis contam como partial success.
 */
// setupTests.js mocka o RTK globalmente (testes de componentes); aqui o teste
// é ao comportamento REAL do baseQuery — precisa do RTK verdadeiro.
jest.unmock('@reduxjs/toolkit');
jest.unmock('@reduxjs/toolkit/query/react');
jest.unmock('react-redux');

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../amplifyClient.js', () => ({
  getClient: jest.fn(),
  SELECTION_SETS: {},
}));

import { getClient } from '../../amplifyClient.js';
import { participantApi } from '../participantApi';

const buildStore = () =>
  configureStore({
    reducer: { [participantApi.reducerPath]: participantApi.reducer },
    middleware: (getDefault) => getDefault().concat(participantApi.middleware),
  });

const amplifyThrow = (data, errors) => {
  // Forma real do throw do client.graphql (GraphQLResult com data + errors)
  const error = new Error(errors[0]?.message || 'GraphQL error');
  error.data = data;
  error.errors = errors;
  return error;
};

describe('participantApi amplifyBaseQuery', () => {
  test('recusa do gate (campo null + errors): unwrap() rejeita com a message acessível', async () => {
    const graphql = jest.fn().mockRejectedValueOnce(
      amplifyThrow(
        { confirmParticipant: null },
        [{ message: 'BILLING_GATE:WINDOW_EXPIRED' }]
      )
    );
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await expect(
      store
        .dispatch(
          participantApi.endpoints.confirmPresence.initiate({
            eventId: 'evt-1',
            participantId: 'p-1',
            participantStatus: 'ATTENDED',
          })
        )
        .unwrap()
    ).rejects.toMatchObject({
      data: { errors: [{ message: 'BILLING_GATE:WINDOW_EXPIRED' }] },
    });
  });

  test('partial success em query (dados utilizáveis + errors): resolve com os dados', async () => {
    const items = [{ id: 'p-1', participantName: 'Ana' }];
    const graphql = jest.fn().mockRejectedValueOnce(
      amplifyThrow(
        { listParticipants: { items, nextToken: null } },
        [{ message: 'Not Authorized to access participantNote on type Participant' }]
      )
    );
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    const result = await store
      .dispatch(participantApi.endpoints.listAllParticipants.initiate({ limit: 10 }))
      .unwrap();

    expect(result.items).toEqual(items);
  });
});
