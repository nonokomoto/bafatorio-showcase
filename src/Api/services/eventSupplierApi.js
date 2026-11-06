// Import necessary dependencies
import { createApi } from '@reduxjs/toolkit/query/react';
import * as queries from '../../../Graphql/queries';
import * as mutations from '../../../Graphql/mutations';
// Data Client imports for hybrid approach (relational queries)
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
import { invalidateSupplierList } from './supplierApi.js';

// Custom base query function (can reuse from supplierApi or define here)
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    if (response.errors) {
      console.error('GraphQL Errors:', response.errors);
      // Extract more detailed error info
      const errorMessages = response.errors.map(err => ({
        message: err.message,
        errorType: err.errorType,
        path: err.path,
        locations: err.locations
      }));
      return { error: { status: 'GRAPHQL_ERROR', data: response.errors, messages: errorMessages } };
    }
    return { data: response.data };
  } catch (error) {
    console.error('Network/Amplify Error:', error);
    // Log more detailed error information
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      data: error.data
    });
    return { error: { status: error.statusCode || 'FETCH_ERROR', data: error, message: error.message } };
  }
};

// Create the API slice for EventSuppliers
export const eventSupplierApi = createApi({
  reducerPath: 'eventSupplierApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['EventSupplier', 'Event', 'Supplier'], // Define tags for cache invalidation
  endpoints: (builder) => ({
    // Query to get EventSuppliers for a specific event
    listEventSuppliersByEvent: builder.query({
      query: (eventId) => ({
        // Assuming a query like listEventSuppliers exists with a filter for eventId
        // Or potentially a specific query like getEvent with nested suppliers
        document: queries.listEventSuppliers, // Replace with your actual query
        variables: { filter: { eventId: { eq: eventId } } } // Example filter
      }),
      transformResponse: (response) => response?.listEventSuppliers?.items || [], // Adjust based on your query response
      providesTags: (result, error, eventId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'EventSupplier', id })),
              { type: 'EventSupplier', eventId: eventId, id: 'LIST' }, // Tag specific to the event
            ]
          : [{ type: 'EventSupplier', eventId: eventId, id: 'LIST' }],
    }),

    // Mutation to update an EventSupplier via the Lambda-backed custom mutation
    // updateEventSupplierForRole. ADR-015/019/021: authorization is enforced in the
    // handler against the shared event permission matrix (SUPPLIER_EDIT), so
    // collaborators with the right permission can update without hitting the
    // model's rules.owner() gate.
    updateEventSupplier: builder.mutation({
      query: ({ id, quoteAmount, status, invoiceS3Key }) => ({
        document: /* GraphQL */ `
          mutation UpdateEventSupplierForRole(
            $eventSupplierId: String!
            $quoteAmount: Float
            $status: String
            $invoiceS3Key: String
          ) {
            updateEventSupplierForRole(
              eventSupplierId: $eventSupplierId
              quoteAmount: $quoteAmount
              status: $status
              invoiceS3Key: $invoiceS3Key
            ) {
              id
              eventId
              supplierId
              quoteAmount
              status
              invoiceS3Key
              paidAt
              createdAt
              updatedAt
              owner
            }
          }
        `,
        variables: {
          eventSupplierId: id,
          quoteAmount,
          status,
          invoiceS3Key,
        },
      }),
      transformResponse: (response) => response?.updateEventSupplierForRole,
      // Only the EventSupplier itself changes here — status/quoteAmount/
      // invoiceS3Key mutations on PENDING/REJECTED rows never touch
      // Event.committedExpenses. The financial side is handled exclusively
      // by processSupplierApproval / revertEventSupplierApproval /
      // adjustApprovedEventSupplierQuote / processSupplierPayment, each of
      // which invalidates the Event cache with a concrete eventId. The old
      // `{ type: 'Event', id: eventId }` here never worked anyway because
      // callers (EventSupplierList, InvoiceUpload) don't pass eventId in
      // the mutation args — tag resolved to `id: undefined` and no cache
      // entry was actually invalidated.
      invalidatesTags: (result, error, { id }) => [
        { type: 'EventSupplier', id },
      ],
    }),

    // Mutation to delete an EventSupplier (unlink)
    removeEventSupplier: builder.mutation({
      query: ({ eventSupplierId }) => ({
        document: mutations.removeEventSupplier,
        variables: { eventSupplierId }
      }),
      transformResponse: (response) => response?.removeEventSupplier,
      invalidatesTags: (result, error, { eventSupplierId }) => {
        const eventId = result?.eventId;
        const tags = [
          { type: 'EventSupplier', id: eventSupplierId },
          { type: 'Event', id: 'LIST' }
        ];
        if (eventId) {
          tags.push({ type: 'Event', id: eventId });
          tags.push({ type: 'EventSupplier', eventId: eventId, id: 'LIST' });
        }
        return tags;
      },
    }),

    // Mutation to approve a supplier and update event budget
    // Uses inline document to pass quoteAmount (auto-generated mutation predates this argument)
    processSupplierApproval: builder.mutation({
      query: ({ eventSupplierId, quoteAmount }) => ({
        document: /* GraphQL */ `
          mutation ProcessSupplierApproval($eventSupplierId: String!, $quoteAmount: Float) {
            processSupplierApproval(eventSupplierId: $eventSupplierId, quoteAmount: $quoteAmount) {
              id
              eventId
              supplierId
              quoteAmount
              status
              owner
              createdAt
              updatedAt
            }
          }
        `,
        variables: { eventSupplierId, quoteAmount },
      }),
      transformResponse: (response) => response?.processSupplierApproval,
      invalidatesTags: (result, error, { eventSupplierId }) => {
        const eventId = result?.eventId;
        const tags = [
          { type: 'EventSupplier', id: eventSupplierId },
          { type: 'Event', id: 'LIST' }
        ];
        if (eventId) {
          tags.push({ type: 'Event', id: eventId });
          tags.push({ type: 'EventSupplier', eventId: eventId, id: 'LIST' });
        }
        return tags;
      },
    }),

    // Mutation to process supplier payment
    processSupplierPayment: builder.mutation({
      query: ({ eventSupplierId }) => ({
        document: mutations.processSupplierPayment,
        variables: { eventSupplierId }
      }),
      transformResponse: (response) => response?.processSupplierPayment,
      invalidatesTags: (result, error, { eventSupplierId }) => {
        const eventId = result?.eventId;
        const tags = [
          { type: 'EventSupplier', id: eventSupplierId },
          { type: 'Event', id: 'LIST' }
        ];
        if (eventId) {
          tags.push({ type: 'Event', id: eventId });
          tags.push({ type: 'EventSupplier', eventId: eventId, id: 'LIST' });
        }
        return tags;
      },
    }),

    // Mutation to revert supplier approval
    revertEventSupplierApproval: builder.mutation({
      query: ({ eventSupplierId, newStatus }) => ({
        document: mutations.revertEventSupplierApproval,
        variables: { eventSupplierId, newStatus }
      }),
      transformResponse: (response) => response?.revertEventSupplierApproval,
      // Invalidate the specific EventSupplier and the Event
      invalidatesTags: (result, error, { eventSupplierId }) => {
        const eventId = result?.eventId; // Get eventId from the result
        const tags = [
            { type: 'EventSupplier', id: eventSupplierId },
            { type: 'Event', id: 'LIST' } // Invalidate event list as well
        ];
        if (eventId) {
            tags.push({ type: 'Event', id: eventId });
            tags.push({ type: 'EventSupplier', eventId: eventId, id: 'LIST' });
        }
        return tags;
      },
    }),

    // Mutation to adjust approved supplier quote
    adjustApprovedEventSupplierQuote: builder.mutation({
        query: ({ eventSupplierId, newQuoteAmount }) => ({
            document: mutations.adjustApprovedEventSupplierQuote,
            variables: { eventSupplierId, newQuoteAmount }
        }),
        transformResponse: (response) => response?.adjustApprovedEventSupplierQuote,
        // Invalidate the specific EventSupplier and the Event
        invalidatesTags: (result, error, { eventSupplierId }) => {
          const eventId = result?.eventId; // Get eventId from the result
          const tags = [
              { type: 'EventSupplier', id: eventSupplierId },
              { type: 'Event', id: 'LIST' } // Invalidate event list as well
          ];
          if (eventId) {
              tags.push({ type: 'Event', id: eventId });
              tags.push({ type: 'EventSupplier', eventId: eventId, id: 'LIST' });
          }
          return tags;
        },
    }),

    // ========================================
    // NEW: Enhanced Data Client Queries (Relational)
    // ========================================

    /**
     * Query enhanced que busca EventSuppliers de um evento COM dados do Event e Supplier
     * Usa custom query Lambda (listEventSuppliersQuery) que valida acesso via
     * EventCollaborator, permitindo que co-colaboradores vejam fornecedores.
     * @param {string} eventId - ID do evento
     * @returns EventSuppliers com dados nested de Supplier + eventData
     */
    listEventSuppliersByEventEnhanced: builder.query({
      query: ({ eventId }) => ({
        document: /* GraphQL */ `
          query ListEventSuppliersQuery($eventId: String!) {
            listEventSuppliersQuery(eventId: $eventId) {
              items {
                id
                eventId
                supplierId
                quoteAmount
                status
                invoiceS3Key
                paidAt
                requestedBy
                approvalStatus
                approvedBy
                approvedAt
                rejectionReason
                owner
                createdAt
                updatedAt
                supplier {
                  id
                  name
                  category
                  contactName
                  contactEmail
                  contactPhone
                  currency
                  estimateMinAmount
                  estimateMaxAmount
                }
              }
              eventData {
                id
                eventTitle
                budget
                committedExpenses
                effectiveExpenses
              }
              sharedSuppliers {
                id
                name
                category
                contactName
                contactEmail
                contactPhone
                currency
                estimateMinAmount
                estimateMaxAmount
              }
            }
          }
        `,
        variables: { eventId },
      }),
      transformResponse: (response) => {
        const result = response?.listEventSuppliersQuery;
        return {
          items: result?.items || [],
          eventData: result?.eventData || {},
          sharedSuppliers: result?.sharedSuppliers || [],
        };
      },
      providesTags: (result, error, { eventId }) => {
        if (!result?.items) {
          return [{ type: 'EventSupplier', eventId, id: 'LIST' }];
        }
        return [
          ...result.items.map(({ id }) => ({ type: 'EventSupplier', id })),
          { type: 'EventSupplier', eventId, id: 'LIST' },
          { type: 'Event', id: eventId },
        ];
      },
    }),

    /**
     * Query enhanced para buscar um único EventSupplier COM relações
     * @param {string} id - ID do EventSupplier
     * @returns EventSupplier com dados nested de Event e Supplier
     */
    getEventSupplierEnhanced: builder.query({
      async queryFn({ id }) {
        const dataClient = getClient();

        try {
          const { data: eventSupplier, errors } = await dataClient.models.EventSupplier.get(
            { id },
            { selectionSet: SELECTION_SETS.EVENT_SUPPLIER_WITH_RELATIONS }
          );

          if (errors) {
            console.error('[getEventSupplierEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          if (!eventSupplier) {
            return { error: { status: 'NOT_FOUND', message: `EventSupplier ${id} not found` } };
          }

          return { data: eventSupplier };
        } catch (error) {
          console.error('[getEventSupplierEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { id }) => [
        { type: 'EventSupplier', id },
        ...(result?.eventId ? [{ type: 'Event', id: result.eventId }] : []),
        ...(result?.supplierId ? [{ type: 'Supplier', id: result.supplierId }] : []),
      ],
    }),

    // ========================================
    // SUPPLIER SELECTION WITH APPROVAL FLOW
    // Per ACCESS_LEVELS_STRATEGY.md
    // ========================================

    /**
     * Select/add a supplier to an event with approval workflow
     * - OWNER/CO_MANAGER: Direct selection (approvalStatus = 'DIRECT')
     * - STAFF_LOGISTICS: Requires approval (approvalStatus = 'PENDING_APPROVAL')
     * @param {string} eventId - Event ID
     * @param {string} supplierId - Supplier ID
     * @param {number} quoteAmount - Optional quote amount
     */
    selectEventSupplier: builder.mutation({
      query: ({ eventId, supplierId, quoteAmount }) => ({
        document: /* GraphQL */ `
          mutation SelectEventSupplier(
            $eventId: String!
            $supplierId: String!
            $quoteAmount: Float
          ) {
            selectEventSupplier(
              eventId: $eventId
              supplierId: $supplierId
              quoteAmount: $quoteAmount
            ) {
              id
              eventId
              supplierId
              quoteAmount
              status
              approvalStatus
              requestedBy
              approvedBy
              approvedAt
              rejectionReason
              createdAt
              updatedAt
              owner
            }
          }
        `,
        variables: { eventId, supplierId, quoteAmount },
      }),
      transformResponse: (response) => response?.selectEventSupplier,
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'EventSupplier', eventId, id: 'LIST' },
        { type: 'Event', id: eventId },
      ],
    }),

    /**
     * Approve or reject a supplier selection (OWNER only)
     * Per ACCESS_LEVELS_STRATEGY.md
     * @param {string} eventSupplierId - EventSupplier ID
     * @param {boolean} approved - True to approve, false to reject
     * @param {string} rejectionReason - Optional reason for rejection
     */
    approveSupplierSelection: builder.mutation({
      query: ({ eventSupplierId, approved, rejectionReason }) => ({
        document: /* GraphQL */ `
          mutation ApproveSupplierSelection(
            $eventSupplierId: String!
            $approved: Boolean!
            $rejectionReason: String
          ) {
            approveSupplierSelection(
              eventSupplierId: $eventSupplierId
              approved: $approved
              rejectionReason: $rejectionReason
            ) {
              id
              eventId
              supplierId
              quoteAmount
              status
              approvalStatus
              requestedBy
              approvedBy
              approvedAt
              rejectionReason
              createdAt
              updatedAt
              owner
            }
          }
        `,
        variables: { eventSupplierId, approved, rejectionReason },
      }),
      transformResponse: (response) => response?.approveSupplierSelection,
      invalidatesTags: (result, error, { eventSupplierId }) => {
        const eventId = result?.eventId;
        const tags = [
          { type: 'EventSupplier', id: eventSupplierId },
          { type: 'Event', id: 'LIST' },
        ];
        if (eventId) {
          tags.push({ type: 'Event', id: eventId });
          tags.push({ type: 'EventSupplier', eventId, id: 'LIST' });
        }
        return tags;
      },
    }),

    /**
     * List EventSuppliers pending approval for an event
     * Useful for owners to see what needs to be approved
     * @param {string} eventId - Event ID
     */
    listPendingApprovals: builder.query({
      async queryFn({ eventId }) {
        const dataClient = getClient();

        try {
          const { data: eventSuppliers, errors } = await dataClient.models.EventSupplier.list({
            filter: {
              eventId: { eq: eventId },
              approvalStatus: { eq: 'PENDING_APPROVAL' },
            },
            selectionSet: [
              'id',
              'eventId',
              'supplierId',
              'quoteAmount',
              'status',
              'approvalStatus',
              'requestedBy',
              'createdAt',
              'supplier.id',
              'supplier.name',
              'supplier.category',
            ],
          });

          if (errors) {
            console.error('[listPendingApprovals] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          return { data: eventSuppliers || [] };
        } catch (error) {
          console.error('[listPendingApprovals] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'EventSupplier', eventId, id: 'PENDING' },
        { type: 'EventSupplier', eventId, id: 'LIST' },
      ],
    }),

    /**
     * Dual-write import: creates Supplier + EventSupplier in one call.
     * The rows argument is JSON-stringified so a large payload survives the
     * AppSync 256KB argument limit cleanly (and matches the pattern used by
     * selectEventSupplier and importNormalizedSuppliers).
     *
     * Dedup per the Option B plan (shared helper
     * buildSupplierDuplicateKey in amplify/function/shared/importUtils.ts):
     *   - Supplier reused if name+email matches (email present) OR
     *     name+phone matches (phone present) OR plain name matches (neither
     *     present). No field is overwritten on reuse.
     *   - EventSupplier skipped if (eventId, supplierId) already linked.
     *
     * @param {string} eventId
     * @param {Array<NormalizedEventSupplierRow>} rows
     */
    importNormalizedEventSuppliers: builder.mutation({
      query: ({ eventId, rows }) => ({
        document: /* GraphQL */ `
          mutation ImportNormalizedEventSuppliers(
            $eventId: String!
            $rows: String!
          ) {
            importNormalizedEventSuppliers(
              eventId: $eventId
              rows: $rows
            ) {
              success
              message
              reason
              suppliersCreated
              suppliersReused
              suppliersDeduplicatedInBatch
              eventSuppliersCreated
              rowsAlreadyLinkedOnEvent
              rowsDuplicatedInBatch
              validationErrorCount
            }
          }
        `,
        variables: {
          eventId,
          rows: JSON.stringify(rows),
        },
      }),
      transformResponse: (response) => response?.importNormalizedEventSuppliers,
      invalidatesTags: (result, error, { eventId }) =>
        result?.success
          ? [
              { type: 'EventSupplier', eventId, id: 'LIST' },
              { type: 'EventSupplier', eventId, id: 'PENDING' },
              { type: 'Event', id: eventId },
            ]
          : [],
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // supplierApi é um slice RTK Query separado do eventSupplierApi — o
          // Lambda desta mutation pode criar Supplier novos (dual-write), sem
          // passar pelo supplierApi, por isso a lista global de suppliers
          // fica desatualizada sem esta invalidação cruzada.
          if (data?.success) {
            invalidateSupplierList(dispatch);
          }
        } catch {
          // Import falhou — nada para invalidar
        }
      },
    }),

  }),
});

// Export generated hooks
export const {
  useListEventSuppliersByEventQuery,
  useUpdateEventSupplierMutation,
  useRemoveEventSupplierMutation,
  useProcessSupplierApprovalMutation,
  useProcessSupplierPaymentMutation,
  useRevertEventSupplierApprovalMutation,
  useAdjustApprovedEventSupplierQuoteMutation,
  // Enhanced Data Client hooks
  useListEventSuppliersByEventEnhancedQuery,
  // Lazy: o relatório PDF só busca fornecedores quando é pedido, para não
  // pagar a query em cada abertura do evento.
  useLazyListEventSuppliersByEventEnhancedQuery,
  useGetEventSupplierEnhancedQuery,
  // Supplier Selection with Approval Flow (ACCESS_LEVELS_STRATEGY.md)
  useSelectEventSupplierMutation,
  useApproveSupplierSelectionMutation,
  useListPendingApprovalsQuery,
  // Dual-write bulk import (Option B)
  useImportNormalizedEventSuppliersMutation,
} = eventSupplierApi; 