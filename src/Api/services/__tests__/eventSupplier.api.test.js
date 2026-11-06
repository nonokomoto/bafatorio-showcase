/**
 * Regression coverage for the collaborator-aware update path.
 * Ensures updateEventSupplier routes through the Lambda-backed mutation
 * `updateEventSupplierForRole` (ADR-019 / ADR-021) and no longer calls
 * `dataClient.models.EventSupplier.update()` directly.
 */

jest.mock('@reduxjs/toolkit', () => jest.requireActual('@reduxjs/toolkit'));
jest.mock('@reduxjs/toolkit/query/react', () =>
  jest.requireActual('@reduxjs/toolkit/query/react')
);
jest.mock('react-redux', () => jest.requireActual('react-redux'));

jest.mock('../../amplifyClient.js', () => {
  const graphql = jest.fn();
  const modelUpdate = jest.fn();
  return {
    getClient: jest.fn(() => ({
      graphql,
      models: { EventSupplier: { update: modelUpdate } },
    })),
    SELECTION_SETS: { EVENT_SUPPLIER_WITH_RELATIONS: [] },
    __graphql: graphql,
    __modelUpdate: modelUpdate,
  };
});

import { configureStore } from '@reduxjs/toolkit';
import { eventSupplierApi } from '../eventSupplierApi.js';
import * as amplifyClientMock from '../../amplifyClient.js';

const buildStore = () =>
  configureStore({
    reducer: { [eventSupplierApi.reducerPath]: eventSupplierApi.reducer },
    middleware: (getDefault) => getDefault().concat(eventSupplierApi.middleware),
  });

describe('eventSupplierApi updateEventSupplier', () => {
  beforeEach(() => {
    amplifyClientMock.__graphql.mockReset();
    amplifyClientMock.__modelUpdate.mockReset();
  });

  it('routes the update through the lambda-backed updateEventSupplierForRole mutation', async () => {
    amplifyClientMock.__graphql.mockResolvedValueOnce({
      data: {
        updateEventSupplierForRole: {
          id: 'es-1',
          eventId: 'evt-1',
          supplierId: 'sup-1',
          quoteAmount: 250,
          status: 'PENDING',
          invoiceS3Key: null,
          createdAt: '2026-04-23T09:00:00Z',
          updatedAt: '2026-04-23T09:05:00Z',
          owner: 'owner-1::owner-1',
        },
      },
    });

    const store = buildStore();
    const result = await store
      .dispatch(
        eventSupplierApi.endpoints.updateEventSupplier.initiate({
          id: 'es-1',
          eventId: 'evt-1',
          quoteAmount: 250,
          status: 'PENDING',
        })
      )
      .unwrap();

    expect(amplifyClientMock.__modelUpdate).not.toHaveBeenCalled();
    expect(amplifyClientMock.__graphql).toHaveBeenCalledTimes(1);

    const call = amplifyClientMock.__graphql.mock.calls[0][0];
    expect(call.query).toMatch(/updateEventSupplierForRole/);
    expect(call.variables.eventSupplierId).toBe('es-1');
    expect(call.variables.quoteAmount).toBe(250);
    expect(call.variables.status).toBe('PENDING');

    expect(result.id).toBe('es-1');
    expect(result.quoteAmount).toBe(250);
  });
});
