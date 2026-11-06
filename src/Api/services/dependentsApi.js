// Import necessary dependencies
import { createApi } from '@reduxjs/toolkit/query/react';
import * as queries from '../../../Graphql/queries';
import * as mutations from '../../../Graphql/mutations';
// Data Client imports for hybrid approach
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
import { invalidateParticipant } from './participantApi.js';

// Custom base query function to work with Amplify's GraphQL API
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[DependentAPI] GraphQL Error:', error.errors?.[0]?.message || error.message);

    return { error: { status: error.statusCode, data: error } };
  }
};

// Pagination safeguard
const MAX_PAGES = 50;

// Create the API slice
export const dependentApi = createApi({
  reducerPath: 'dependentApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Dependent', 'Participant', 'Event'],
  endpoints: (builder) => ({
    // Query to get dependents for specific participant IDs
    listDependentsByParticipantIds: builder.query({
      async queryFn({ participantIds }, api, extraOptions, baseQuery) {
        let allDependents = [];
        let nextToken = null;
        let pageCount = 0;
        try {
          do {
            const result = await baseQuery({
              document: queries.listDependents,
              variables: {
                filter: {
                  or: participantIds.map(pid => ({ participantId: { eq: pid } }))
                },
                limit: 1000,
                nextToken,
              },
            });

            if (result.error) return { error: result.error };

            const response = result.data.listDependents;
            allDependents.push(...response.items);
            nextToken = response.nextToken;
            pageCount++;
            if (pageCount >= MAX_PAGES) break;
          } while (nextToken);

          return { data: allDependents };
        } catch (error) {
          console.error('[DependentAPI] Error listing dependents by participant IDs:', error);
          return { error: { status: 'CUSTOM_ERROR', error: 'Failed to load dependents' } };
        }
      },
      providesTags: (result, error, { participantIds }) => {
        const tags = [{ type: 'Dependent', id: 'LIST_BY_PARTICIPANTS' }];
        if (Array.isArray(participantIds)) {
          participantIds.forEach(pid => {
            tags.push({ type: 'Dependent', id: `LIST_PARTICIPANT_${pid}` });
          });
        }
        return tags;
      }
    }),

    // Query to fetch ALL dependents (for dashboard, etc.)
    listAllDependents: builder.query({
      async queryFn(_, api, extraOptions, baseQuery) {
        const allDependents = [];
        let nextToken = null;
        let pageCount = 0;
        try {
          do {
            const result = await baseQuery({
              document: queries.listDependents,
              variables: {
                limit: 1000,
                nextToken
              },
            });

            if (result.error) return { error: result.error };

            const response = result.data.listDependents;
            allDependents.push(...response.items);
            nextToken = response.nextToken;
            pageCount++;
            if (pageCount >= MAX_PAGES) break;
          } while (nextToken);

          return { data: { items: allDependents } };

        } catch (error) {
          console.error('Error fetching all dependents:', error);
          return { error: { status: 'CUSTOM_ERROR', error: 'Failed to load all dependents' } };
        }
      },
      providesTags: [{ type: 'Dependent', id: 'LIST_ALL' }],
    }),

    // Mutation to create a new dependent (uses custom Lambda to bypass owner authorization)
    // Sets event owner as record owner so all team members can access via standard queries
    createDependent: builder.mutation({
      query: ({ name, age, participantId, eventId, status }) => ({
        document: mutations.createDependentCustom,
        variables: { name, age, participantId, eventId, status }
      }),
      transformResponse: (response) => response.createDependentCustom,
      invalidatesTags: (result, error, { participantId, eventId }) => {
        const tags = [
          { type: 'Dependent', id: 'LIST_ALL' },
          { type: 'Dependent', id: 'LIST_BY_PARTICIPANTS' }
        ];
        if (participantId) {
          tags.push({ type: 'Dependent', id: `LIST_PARTICIPANT_${participantId}` });
        }
        if (eventId) {
          tags.push({ type: 'Dependent', id: `LIST_EVENT_${eventId}` });
        }
        return tags;
      },
      async onQueryStarted({ participantId, eventId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // participantApi é um slice RTK Query separado — dependentsCount é
          // lido de lá, e a criação de um dependente muda-o sem passar por
          // nenhuma mutation desse slice, por isso precisa desta invalidação cruzada.
          invalidateParticipant(dispatch, { participantId, eventId });
        } catch {
          // Criação falhou — nada para invalidar
        }
      },
    }),

    // Mutation to update an existing dependent
    // Uses Lambda-backed mutation to bypass rules.owner() for collaborator access
    // participantId and eventId are passed for tag invalidation only, not sent to Lambda
    updateDependent: builder.mutation({
      query: ({ id, name, age }) => ({
        document: mutations.updateDependentCustom,
        variables: { id, name, age }
      }),
      transformResponse: (response) => response.updateDependentCustom,
      invalidatesTags: (result, error, { id, participantId, eventId }) => {
        const tags = [
          { type: 'Dependent', id },
          { type: 'Dependent', id: 'LIST_ALL' },
          { type: 'Dependent', id: 'LIST_BY_PARTICIPANTS' }
        ];
        if (participantId) {
          tags.push({ type: 'Dependent', id: `LIST_PARTICIPANT_${participantId}` });
        }
        if (eventId) {
          tags.push({ type: 'Dependent', id: `LIST_EVENT_${eventId}` });
        }
        return tags;
      },
      async onQueryStarted({ participantId, eventId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // participantApi é um slice RTK Query separado — ver comentário em createDependent.
          invalidateParticipant(dispatch, { participantId, eventId });
        } catch {
          // Atualização falhou — nada para invalidar
        }
      },
    }),

    // Mutation to delete a dependent (uses custom Lambda to bypass owner authorization)
    deleteDependent: builder.mutation({
      query: ({ id }) => ({
        document: mutations.deleteDependentCustom,
        variables: { id }
      }),
      transformResponse: (response) => response.deleteDependentCustom,
      invalidatesTags: (result, error, { participantId, eventId }) => {
        const tags = [
          { type: 'Dependent', id: 'LIST_ALL' },
          { type: 'Dependent', id: 'LIST_BY_PARTICIPANTS' }
        ];
        if (participantId) {
          tags.push({ type: 'Dependent', id: `LIST_PARTICIPANT_${participantId}` });
        }
        if (eventId) {
          tags.push({ type: 'Dependent', id: `LIST_EVENT_${eventId}` });
        }
        return tags;
      },
      async onQueryStarted({ participantId, eventId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // participantApi é um slice RTK Query separado — ver comentário em createDependent.
          invalidateParticipant(dispatch, { participantId, eventId });
        } catch {
          // Eliminação falhou — nada para invalidar
        }
      },
    }),

    // ========================================
    // Hybrid Data Client Queries (Fase 4)
    // ========================================

    /**
     * List dependents for a specific participant using Data Client
     * Uses Participant.get with dependents relation
     */
    listDependentsByParticipantEnhanced: builder.query({
      async queryFn({ participantId }) {
        const dataClient = getClient();

        try {
          // Fetch participant with dependents relation
          const { data: participant, errors } = await dataClient.models.Participant.get(
            { id: participantId },
            { selectionSet: SELECTION_SETS.PARTICIPANT_WITH_DEPENDENTS }
          );

          if (errors) {
            console.error('[listDependentsByParticipantEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          if (!participant) {
            return { error: { status: 'NOT_FOUND', message: `Participant ${participantId} not found` } };
          }

          const dependents = participant.dependents || [];

          return { data: { items: dependents } };
        } catch (error) {
          console.error('[listDependentsByParticipantEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { participantId }) => [
        { type: 'Dependent', id: `LIST_PARTICIPANT_${participantId}` }
      ],
    }),

    /**
     * List ALL dependents for an event using a flat filter query.
     * Paginated to handle events with many dependents.
     */
    listDependentsByEventEnhanced: builder.query({
      async queryFn({ eventId }, api, extraOptions, baseQuery) {
        const allDependents = [];
        let nextToken = null;
        let pageCount = 0;
        try {
          do {
            const result = await baseQuery({
              document: queries.listDependents,
              variables: {
                filter: { eventId: { eq: eventId } },
                limit: 1000,
                nextToken,
              },
            });

            if (result.error) return { error: result.error };

            const response = result.data.listDependents;
            allDependents.push(...response.items);
            nextToken = response.nextToken;
            pageCount++;
            if (pageCount >= MAX_PAGES) break;
          } while (nextToken);

          return { data: { items: allDependents } };
        } catch (error) {
          console.error('[listDependentsByEventEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'Dependent', id: `LIST_EVENT_${eventId}` },
        { type: 'Event', id: eventId }
      ],
    }),

  })
});

// Export generated hooks
export const {
  useListDependentsByParticipantIdsQuery,
  useListAllDependentsQuery,
  useCreateDependentMutation,
  useUpdateDependentMutation,
  useDeleteDependentMutation,
  // Enhanced Data Client hooks
  useListDependentsByParticipantEnhancedQuery,
  useListDependentsByEventEnhancedQuery,
} = dependentApi;
