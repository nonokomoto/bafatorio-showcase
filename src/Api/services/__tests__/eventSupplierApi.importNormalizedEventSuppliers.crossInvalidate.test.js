/**
 * importNormalizedEventSuppliers (dual-write import) pode criar Supplier
 * novos via Lambda sem passar pelo supplierApi. Regressão para garantir que a
 * lista global de suppliers é invalidada no slice certo — ver ADR-039.
 */
jest.unmock('@reduxjs/toolkit');
jest.unmock('@reduxjs/toolkit/query/react');
jest.unmock('react-redux');

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../amplifyClient.js', () => ({
  getClient: jest.fn(),
  SELECTION_SETS: {},
}));

jest.mock('../supplierApi.js', () => ({
  invalidateSupplierList: jest.fn(),
}));

import { getClient } from '../../amplifyClient.js';
import { eventSupplierApi } from '../eventSupplierApi.js';
import { invalidateSupplierList } from '../supplierApi.js';

const buildStore = () =>
  configureStore({
    reducer: { [eventSupplierApi.reducerPath]: eventSupplierApi.reducer },
    middleware: (getDefault) => getDefault().concat(eventSupplierApi.middleware),
  });

describe('importNormalizedEventSuppliers — invalidação cruzada do supplierApi', () => {
  beforeEach(() => {
    invalidateSupplierList.mockClear();
  });

  test('sucesso: invalida a lista global de suppliers', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: {
        importNormalizedEventSuppliers: {
          success: true,
          suppliersCreated: 3,
          suppliersReused: 1,
          eventSuppliersCreated: 4,
        },
      },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(
        eventSupplierApi.endpoints.importNormalizedEventSuppliers.initiate({
          eventId: 'evt-1',
          rows: [{ name: 'Fornecedor X' }],
        })
      )
      .unwrap();

    expect(invalidateSupplierList).toHaveBeenCalledWith(expect.any(Function));
  });

  test('success:false no payload: não invalida nada', async () => {
    const graphql = jest.fn().mockResolvedValue({
      data: {
        importNormalizedEventSuppliers: { success: false, message: 'erro de validação' },
      },
    });
    getClient.mockReturnValue({ graphql });

    const store = buildStore();
    await store
      .dispatch(
        eventSupplierApi.endpoints.importNormalizedEventSuppliers.initiate({
          eventId: 'evt-1',
          rows: [],
        })
      )
      .unwrap();

    expect(invalidateSupplierList).not.toHaveBeenCalled();
  });
});
