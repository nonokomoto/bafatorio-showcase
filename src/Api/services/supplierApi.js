// Import necessary dependencies
import { createApi } from '@reduxjs/toolkit/query/react';
import * as queries from '../../../Graphql/queries';
import * as mutations from '../../../Graphql/mutations';
import * as subscriptions from '../../../Graphql/subscriptions';
// Data Client imports for hybrid approach (Phase 1 - ADR-016)
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
// Cross-API invalidation imports (Phase 2 - ADR-016)
import { eventSupplierApi } from './eventSupplierApi.js';
import { createReconnectingSubscription } from '../subscriptions/reconnectingSubscription.js';

const uploadSupplierMutationDocument = /* GraphQL */ `
  mutation UploadSupplier($file: String!) {
    uploadSupplier(file: $file) {
      success
      message
      supplierCount
      reason
      skippedCount
      duplicateCount
      validationErrorCount
      writeErrorCount
      rowErrors {
        row
        message
      }
    }
  }
`;

const importNormalizedSuppliersMutationDocument = /* GraphQL */ `
  mutation ImportNormalizedSuppliers($suppliers: String!, $rowOffset: Int) {
    importNormalizedSuppliers(suppliers: $suppliers, rowOffset: $rowOffset) {
      success
      message
      supplierCount
      reason
      skippedCount
      duplicateCount
      validationErrorCount
      writeErrorCount
      rowErrors {
        row
        message
      }
    }
  }
`;

// Custom base query function to work with Amplify's GraphQL API
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    if (response.errors) {
      console.error('GraphQL Errors:', response.errors);
      return { error: { status: 'GRAPHQL_ERROR', data: response.errors } };
    }
    return { data: response.data };
  } catch (error) {
    console.error('Network/Amplify Error:', error);
    return { error: { status: error.statusCode || 'FETCH_ERROR', data: error } };
  }
};

// Create the API slice for Suppliers
export const supplierApi = createApi({
  reducerPath: 'supplierApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Supplier', 'EventSupplier'],
  endpoints: (builder) => ({
    // Query to get a single supplier by ID
    getSupplier: builder.query({
      query: (id) => ({
        document: queries.getSupplier,
        variables: { id }
      }),
      transformResponse: (response) => response?.getSupplier,
      providesTags: (result, error, id) => [{ type: 'Supplier', id }],
    }),

    // Query to list all suppliers with real-time subscription updates (Phase 4 - ADR-016)
    listSuppliers: builder.query({
      // With owner-based auth, AppSync scans the multi-tenant table in pages
      // and only THEN filters to this owner — a page can return few (or zero)
      // of the caller's items plus a nextToken. Following the token here is
      // what guarantees the full list; a single request silently truncates
      // as soon as the table outgrows one scan page.
      async queryFn(args, _api, _extraOptions, baseQuery) {
        const items = [];
        let nextToken = null;
        const MAX_PAGES = 50; // Safety guard against infinite pagination
        let page = 0;

        do {
          const result = await baseQuery({
            document: queries.listSuppliers,
            variables: { ...args, limit: 1000, nextToken },
          });
          if (result.error) return { error: result.error };

          const data = result.data?.listSuppliers;
          items.push(...(data?.items ?? []));
          nextToken = data?.nextToken ?? null;
          page++;
        } while (nextToken && page < MAX_PAGES);

        return { data: { items } };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: 'Supplier', id })),
              { type: 'Supplier', id: 'LIST' },
            ]
          : [{ type: 'Supplier', id: 'LIST' }],
      // Phase 4: Real-time subscription updates (matching eventApi.subscribeToEventChanges pattern)
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        try {
          await cacheDataLoaded;

          // Subscribe to new supplier creations
          const createSubscription = createReconnectingSubscription({
            label: 'onCreateSupplier',
            createObservable: () => getClient().graphql({ query: subscriptions.onCreateSupplier }),
            next: (result) => {
              updateCachedData((draft) => {
                if (!draft) return;
                if (!draft.items) draft.items = [];
                const newSupplier = result.data.onCreateSupplier;
                const exists = draft.items.some((s) => s.id === newSupplier.id);
                if (!exists) {
                  draft.items.unshift(newSupplier);
                }
              });
            },
          });

          // Subscribe to supplier updates
          const updateSubscription = createReconnectingSubscription({
            label: 'onUpdateSupplier',
            createObservable: () => getClient().graphql({ query: subscriptions.onUpdateSupplier }),
            next: (result) => {
              updateCachedData((draft) => {
                if (!draft?.items) return;
                const updatedSupplier = result.data.onUpdateSupplier;
                const index = draft.items.findIndex(
                  (s) => s.id === updatedSupplier.id
                );
                if (index !== -1) {
                  draft.items[index] = {
                    ...draft.items[index],
                    ...updatedSupplier,
                  };
                }
              });
            },
          });

          // Subscribe to supplier deletions
          const deleteSubscription = createReconnectingSubscription({
            label: 'onDeleteSupplier',
            createObservable: () => getClient().graphql({ query: subscriptions.onDeleteSupplier }),
            next: (result) => {
              updateCachedData((draft) => {
                if (!draft?.items) return;
                const deletedSupplier = result.data.onDeleteSupplier;
                draft.items = draft.items.filter(
                  (s) => s.id !== deletedSupplier.id
                );
              });
            },
          });

          // Cleanup: unsubscribe when the cache entry is removed
          await cacheEntryRemoved;
          createSubscription.unsubscribe();
          updateSubscription.unsubscribe();
          deleteSubscription.unsubscribe();
        } catch (error) {
          console.error('Error setting up supplier subscriptions:', error);
        }
      },
    }),

    // Mutation to create a new supplier
    createSupplier: builder.mutation({
      query: (newSupplier) => ({
        document: mutations.createSupplier,
        variables: { input: newSupplier }
      }),
      transformResponse: (response) => response?.createSupplier,
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }],
    }),

    // Mutation to update an existing supplier
    updateSupplier: builder.mutation({
      query: ({ id, ...patch }) => ({
        document: mutations.updateSupplier,
        variables: { input: { id, ...patch } }
      }),
      transformResponse: (response) => response?.updateSupplier,
      // Phase 2: Invalidate both specific supplier and list
      invalidatesTags: (result, error, { id }) => [
        { type: 'Supplier', id },
        { type: 'Supplier', id: 'LIST' },
      ],
      // Phase 2: Cross-API invalidation — supplier details changed, EventSupplier caches may be stale
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            eventSupplierApi.util.invalidateTags([
              { type: 'EventSupplier', id: 'LIST' },
            ])
          );
        } catch { /* mutation failed, no cross-invalidation needed */ }
      },
    }),

    // Mutation to delete a supplier — Lambda-backed to block deletion if linked to events
    deleteSupplier: builder.mutation({
      query: (id) => ({
        document: `
          mutation DeleteSupplierCustom($supplierId: String!) {
            deleteSupplierCustom(supplierId: $supplierId) {
              success
              message
              eventCount
            }
          }
        `,
        variables: { supplierId: id },
      }),
      transformResponse: (response) => {
        const result = response?.deleteSupplierCustom;
        if (!result?.success) {
          const err = new Error(result?.message || 'SUPPLIER_DELETE_FAILED');
          err.code = result?.message;
          err.eventCount = result?.eventCount;
          throw err;
        }
        return result;
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Supplier', id },
        { type: 'Supplier', id: 'LIST' },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            eventSupplierApi.util.invalidateTags([
              { type: 'EventSupplier', id: 'LIST' },
            ])
          );
        } catch { /* mutation failed, no cross-invalidation needed */ }
      },
    }),

    // Query to get supplier details scoped to an event (uses Lambda for access control)
    getSupplierForEvent: builder.query({
      query: ({ supplierId, eventId }) => ({
        document: `
          query GetSupplierForEvent($supplierId: String!, $eventId: String!) {
            getSupplierForEvent(supplierId: $supplierId, eventId: $eventId) {
              id
              name
              category
              contactName
              contactEmail
              contactPhone
              website
              country
              address
              vatNumber
              paymentDetails
              estimateMinAmount
              estimateMaxAmount
              estimateUnit
              currency
              tags
              notes
            }
          }
        `,
        variables: { supplierId, eventId },
      }),
      transformResponse: (response) => response?.getSupplierForEvent,
      providesTags: (result, error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
    }),

    // Mutation to upload suppliers from a file
    uploadSupplier: builder.mutation({
      query: (base64File) => ({
        document: uploadSupplierMutationDocument,
        variables: { file: base64File }
      }),
      transformResponse: (response) => response?.uploadSupplier,
      invalidatesTags: (result) => {
        return result?.success
          ? [{ type: 'Supplier', id: 'LIST' }]
          : [];
      },
      // Phase 2: Cross-API invalidation on successful bulk import
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          if (result?.success) {
            dispatch(
              eventSupplierApi.util.invalidateTags([
                { type: 'EventSupplier', id: 'LIST' },
              ])
            );
          }
        } catch { /* upload failed, no cross-invalidation needed */ }
      },
    }),

    // Mutation to import normalized suppliers (JSON input, no ExcelJS)
    importNormalizedSuppliers: builder.mutation({
      query: ({ suppliers, rowOffset }) => ({
        document: importNormalizedSuppliersMutationDocument,
        variables: {
          suppliers: JSON.stringify(suppliers),
          rowOffset: rowOffset ?? 0,
        }
      }),
      transformResponse: (response) => response?.importNormalizedSuppliers,
      invalidatesTags: (result) => {
        return result?.success
          ? [{ type: 'Supplier', id: 'LIST' }]
          : [];
      },
      // Phase 2: Cross-API invalidation on successful bulk import
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          if (result?.success) {
            dispatch(
              eventSupplierApi.util.invalidateTags([
                { type: 'EventSupplier', id: 'LIST' },
              ])
            );
          }
        } catch { /* import failed, no cross-invalidation needed */ }
      },
    }),

    // ========================================
    // NEW: Hybrid Data Client Queries (Phase 1 - ADR-016)
    // ========================================

    /**
     * Enhanced list query using Data Client with auto-pagination.
     * Fetches all suppliers with SUPPLIER_BASIC selectionSet.
     * Matches the pattern used in participantApi.listParticipantsByEventEnhanced.
     */
    listSuppliersEnhanced: builder.query({
      async queryFn() {
        const dataClient = getClient();
        const allSuppliers = [];
        let nextToken = null;
        const MAX_PAGES = 50; // Safety guard against infinite pagination
        let page = 0;

        try {
          do {
            const { data: suppliers, nextToken: token, errors } =
              await dataClient.models.Supplier.list({
                limit: 1000,
                nextToken,
                selectionSet: SELECTION_SETS.SUPPLIER_BASIC
              });

            if (errors) {
              console.error('[listSuppliersEnhanced] GraphQL errors:', errors);
              return { error: { status: 'GRAPHQL_ERROR', data: errors } };
            }

            allSuppliers.push(...suppliers);
            nextToken = token;
            page++;
          } while (nextToken && page < MAX_PAGES);

          return { data: { items: allSuppliers } };
        } catch (error) {
          console.error('[listSuppliersEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result) => [
        { type: 'Supplier', id: 'LIST' },
        ...(result?.items?.map(({ id }) => ({ type: 'Supplier', id })) || [])
      ],
    }),

    /**
     * Get single supplier with Data Client and full selection set.
     * Matches the pattern used in eventApi.getSingleEventEnhanced.
     */
    getSupplierEnhanced: builder.query({
      async queryFn({ id }) {
        const dataClient = getClient();

        try {
          const { data: supplier, errors } = await dataClient.models.Supplier.get(
            { id },
            { selectionSet: SELECTION_SETS.SUPPLIER_BASIC }
          );

          if (errors) {
            console.error('[getSupplierEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          if (!supplier) {
            return { error: { status: 'NOT_FOUND', message: `Supplier ${id} not found` } };
          }

          return { data: supplier };
        } catch (error) {
          console.error('[getSupplierEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { id }) => [{ type: 'Supplier', id }],
    }),
  }),
});

// Export generated hooks
export const {
  useGetSupplierQuery,
  useGetSupplierForEventQuery,
  useListSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useUploadSupplierMutation,
  useImportNormalizedSuppliersMutation,
  // Enhanced Data Client hooks (Phase 1 - ADR-016)
  useListSuppliersEnhancedQuery,
  useGetSupplierEnhancedQuery,
} = supplierApi;

/**
 * Cross-slice invalidation helper — call from another api slice's onQueryStarted
 * whenever its Lambda can create a Supplier as a side effect (e.g. the
 * eventSupplier dual-write import). Centralizes the LIST tag shape so callers
 * never hand-roll it.
 */
export const invalidateSupplierList = (dispatch) => {
  dispatch(supplierApi.util.invalidateTags([{ type: 'Supplier', id: 'LIST' }]));
};
