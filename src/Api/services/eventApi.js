// Import necessary dependencies
import { createApi } from '@reduxjs/toolkit/query/react';
// Data Client imports for hybrid approach
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
// Cross-slice: consumir uma compra Pay-per-event (createEvent) tem de refrescar
// a lista de compras do billingApi — tags de slices diferentes não se tocam.
import { billingApi } from './billingApi.js';
import { collaboratorApi } from './collaboratorApi.js';
import { track } from '../../Utils/analytics';

// Mutation custom Lambda-backed (substitui mutations.createEvent, desativada no
// schema): o servidor decide organizerId, owner e planKey e aplica o gate de
// conta. Documento manual porque o Graphql/mutations.ts auto-gerado já não a tem.
const CREATE_EVENT_DOCUMENT = /* GraphQL */ `
  mutation CreateEvent(
    $eventTitle: String
    $eventManager: String
    $eventManagerEmail: String
    $eventManagerPhone: String
    $eventLocation: String
    $eventDateType: String
    $eventStartDate: AWSDate
    $eventEndDate: AWSDate
    $eventSpecificDates: [String]
    $eventTime: AWSTime
    $eventStatus: String
    $eventType: String
    $description: String
    $categories: [String]
    $budget: Float
    $currency: String
  ) {
    createEvent(
      eventTitle: $eventTitle
      eventManager: $eventManager
      eventManagerEmail: $eventManagerEmail
      eventManagerPhone: $eventManagerPhone
      eventLocation: $eventLocation
      eventDateType: $eventDateType
      eventStartDate: $eventStartDate
      eventEndDate: $eventEndDate
      eventSpecificDates: $eventSpecificDates
      eventTime: $eventTime
      eventStatus: $eventStatus
      eventType: $eventType
      description: $description
      categories: $categories
      budget: $budget
      currency: $currency
    ) {
      success
      message
      event
    }
  }
`;

// Mutation custom Lambda-backed (substitui mutations.updateEvent, desativada no
// schema): a Lambda impõe role event:edit + janela de escrita (BILLING_GATE:*).
const UPDATE_EVENT_DOCUMENT = /* GraphQL */ `
  mutation UpdateEvent(
    $eventId: String!
    $eventTitle: String
    $eventManager: String
    $eventManagerEmail: String
    $eventManagerPhone: String
    $eventLocation: String
    $eventDateType: String
    $eventStartDate: AWSDate
    $eventEndDate: AWSDate
    $eventSpecificDates: [String]
    $eventTime: AWSTime
    $eventStatus: String
    $eventType: String
    $description: String
    $categories: [String]
    $budget: Float
    $currency: String
  ) {
    updateEvent(
      eventId: $eventId
      eventTitle: $eventTitle
      eventManager: $eventManager
      eventManagerEmail: $eventManagerEmail
      eventManagerPhone: $eventManagerPhone
      eventLocation: $eventLocation
      eventDateType: $eventDateType
      eventStartDate: $eventStartDate
      eventEndDate: $eventEndDate
      eventSpecificDates: $eventSpecificDates
      eventTime: $eventTime
      eventStatus: $eventStatus
      eventType: $eventType
      description: $description
      categories: $categories
      budget: $budget
      currency: $currency
    ) {
      success
      message
      event
    }
  }
`;

// Documento dedicado para mudar SÓ o estado. NUNCA reutilizar o
// UPDATE_EVENT_DOCUMENT para updates parciais: ele declara todos os
// argumentos, e variáveis não fornecidas chegam à Lambda como null explícito
// — que os grava, apagando os campos (data loss real, 2026-07-14).
const MARK_EVENT_STATUS_DOCUMENT = /* GraphQL */ `
  mutation MarkEventStatus($eventId: String!, $eventStatus: String) {
    updateEvent(eventId: $eventId, eventStatus: $eventStatus) {
      success
      message
      event
    }
  }
`;

// Mutation custom Lambda-backed (substitui mutations.deleteEvent, desativada no
// schema): OWNER-only; a Lambda apaga filhos → S3 → Event, por esta ordem
// (ADR-035). Documento manual porque o Graphql/mutations.ts auto-gerado já não a tem.
const CASCADE_COUNT_FIELDS = /* GraphQL */ `
        participants
        dependents
        eventSuppliers
        collaborators
        roles
        documentFolders
        scheduleEntries
        notionDocuments
        emailLogs
        s3Objects
        event
`;

const DELETE_EVENT_CASCADE_DOCUMENT = /* GraphQL */ `
  mutation DeleteEventCascade($eventId: String!) {
    deleteEventCascade(eventId: $eventId) {
      success
      deleted { ${CASCADE_COUNT_FIELDS} }
      failed { ${CASCADE_COUNT_FIELDS} }
      errors
    }
  }
`;

// Query de acesso de conta (Lambda get-account-access): "posso criar evento?"
// providesTags ['Event'] — criar/apagar eventos invalida e refaz a contagem.
const GET_ACCOUNT_ACCESS_DOCUMENT = /* GraphQL */ `
  query GetAccountAccess {
    getAccountAccess {
      planKey
      canCreateEvent
      reason
    }
  }
`;

// Custom base query function to work with Amplify's GraphQL API
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    return { error: { status: error.statusCode, data: error } };
  }
};

// Create the API slice for events
export const eventApi = createApi({
  reducerPath: 'eventApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Event', 'Participant', 'Dependent', 'AccountAccess'],
  endpoints: (builder) => ({
    // Acesso de conta (gate cosmético do "criar evento" — a autoridade é a Lambda).
    // Tag própria: uma tag geral 'Event' NÃO seria invalidada pelas invalidações
    // específicas ({id}/{id:'LIST'}) do update/delete — regra do RTK Query.
    getAccountAccess: builder.query({
      query: () => ({ document: GET_ACCOUNT_ACCESS_DOCUMENT }),
      transformResponse: (response) => response?.getAccountAccess ?? null,
      providesTags: ['AccountAccess'],
    }),

    // Mutation to create a new event — Lambda-backed: o gate de conta e o
    // consumo Pay-per-event acontecem no servidor (o decremento flex
    // client-side do modelo antigo morreu).
    createEvent: builder.mutation({
      query: (newEvent) => ({
        document: CREATE_EVENT_DOCUMENT,
        variables: newEvent,
      }),
      transformResponse: (response) => response?.createEvent,
      invalidatesTags: ['Event', 'AccountAccess'],
      // O servidor pode ter consumido uma PlanPurchase — refresca o billingApi.
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success) {
            dispatch(billingApi.util.invalidateTags(['PlanPurchase']));
            track('event_created', { category: (arg.categories || []).join(',') });
          }
        } catch {
          // criação falhou — nada foi consumido
        }
      },
    }),

    // Muda só o eventStatus (banner "Marcar como Realizado"). Documento
    // próprio: passa apenas os 2 args, por isso a Lambda não recebe nulls
    // fantasma nos restantes campos.
    markEventStatus: builder.mutation({
      query: ({ id, eventStatus }) => ({
        document: MARK_EVENT_STATUS_DOCUMENT,
        variables: { eventId: id, eventStatus },
      }),
      transformResponse: (response) => response?.updateEvent,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Event', id },
        { type: 'Event', id: 'LIST' }
      ],
      // A página lê o evento do collaboratorApi (getEventAsCollaborator) — API
      // RTK separada, as tags acima não chegam lá. Mesmo padrão do createEvent
      // com o billingApi.
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success) {
            dispatch(
              collaboratorApi.util.invalidateTags([{ type: 'Event', id }])
            );
          }
        } catch {
          // mutation falhou — a cache mantém o estado real
        }
      },
    }),

    // Mutation to update an existing event — Lambda-backed: role event:edit e
    // janela de escrita são impostos no servidor. ATENÇÃO: enviar sempre o
    // conjunto completo de campos editáveis (como o EventForm faz) — ver nota
    // no MARK_EVENT_STATUS_DOCUMENT.
    updateEvent: builder.mutation({
      query: ({ id, ...updatedEvent }) => ({
        document: UPDATE_EVENT_DOCUMENT,
        variables: { eventId: id, ...updatedEvent },
      }),
      transformResponse: (response) => response?.updateEvent,
      // Invalidate the specific event cache and the list when it's updated
      invalidatesTags: (result, error, { id }) => [
        { type: 'Event', id },
        { type: 'Event', id: 'LIST' }
      ],
    }),

    // Mutation custom Lambda-backed (substitui mutations.deleteEvent, desativada
    // no schema, ADR-035): o servidor apaga o evento e TODAS as entidades filhas
    // + S3. Idempotente — retry seguro após timeout.
    deleteEventCascade: builder.mutation({
      query: (eventId) => ({
        document: DELETE_EVENT_CASCADE_DOCUMENT,
        variables: { eventId },
      }),
      // Lista + acesso de conta: apagar um evento liberta o slot Starter,
      // senão o pré-gate fica preso em STARTER_LIMIT_REACHED até reload.
      invalidatesTags: () => [{ type: 'Event', id: 'LIST' }, 'AccountAccess'],
      transformResponse: (response) => response?.deleteEventCascade,
      // O collaboratorApi é uma API RTK separada — as tags acima não lá chegam.
      // Refresca a lista de eventos colaborados e o evento aberto. Mesmo padrão
      // do markEventStatus; antes vivia (incompleto) dentro do EventDelete.
      async onQueryStarted(eventId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success) {
            dispatch(collaboratorApi.util.invalidateTags([
              'Collaborator',
              { type: 'Event', id: eventId },
            ]));
          }
        } catch {
          // apagar falhou — a cache mantém o estado real
        }
      },
    }),

    // ========================================
    // NEW: Hybrid Data Client Queries (Fase 2)
    // ========================================

    /**
     * Minimal query for the events list page.
     * Fetches only the fields needed for EventCard display (no participants nested).
     * Uses EVENT_MINIMAL selectionSet for optimal performance.
     */
    listEventsMinimal: builder.query({
      async queryFn() {
        const dataClient = getClient();

        try {
          const allEvents = [];
          let nextToken = undefined;
          let page = 0;

          do {
            const { data: events, nextToken: token, errors } = await dataClient.models.Event.list({
              selectionSet: SELECTION_SETS.EVENT_MINIMAL,
              nextToken,
            });

            if (errors) {
              console.error('[listEventsMinimal] GraphQL errors:', errors);
              return { error: { status: 'GRAPHQL_ERROR', data: errors } };
            }

            allEvents.push(...(events || []));
            nextToken = token;
          } while (nextToken && ++page < 50);

          return {
            data: {
              items: allEvents.map(event => ({
                ...event,
                participantCount: event.participantCount ?? 0,
                dependentCount: event.dependentCount ?? 0,
                totalRegistrations: event.totalRegistrations ?? event.participantCount ?? 0
              }))
            }
          };
        } catch (error) {
          console.error('[listEventsMinimal] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result) => [
        { type: 'Event', id: 'LIST' },
        ...(result?.items?.map(event => ({ type: 'Event', id: event.id })) || [])
      ],
    }),

    /**
     * Enhanced query using Data Client with selectionSet
     * Fetches events WITH participants in a single query
     * Use feature flag USE_ENHANCED_EVENT_QUERIES to enable
     */
    listEventsEnhanced: builder.query({
      async queryFn() {
        const dataClient = getClient();
        
        try {
          const { data: events, errors } = await dataClient.models.Event.list({
            selectionSet: SELECTION_SETS.EVENT_WITH_PARTICIPANTS
          });

          if (errors) {
            console.error('[listEventsEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          return {
            data: {
              items: events.map(event => ({
                ...event,
                // Calculate participantCount from relation if not set
                participantCount: event.participantCount ?? event.participants?.length ?? 0
              }))
            }
          };
        } catch (error) {
          console.error('[listEventsEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result) => [
        { type: 'Event', id: 'LIST' },
        ...(result?.items?.map(event => ({ type: 'Event', id: event.id })) || [])
      ],
    }),

    /**
     * Get single event with participants using Data Client
     */
    getSingleEventEnhanced: builder.query({
      async queryFn({ id }) {
        const dataClient = getClient();
        
        try {
          const { data: event, errors } = await dataClient.models.Event.get(
            { id },
            { selectionSet: SELECTION_SETS.EVENT_WITH_PARTICIPANTS }
          );

          if (errors) {
            console.error('[getSingleEventEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          if (!event) {
            return { error: { status: 'NOT_FOUND', message: `Event ${id} not found` } };
          }

          return { data: event };
        } catch (error) {
          console.error('[getSingleEventEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { id }) => [
        { type: 'Event', id },
        { type: 'Participant', id: `LIST_${id}` },
      ],
    }),
  }),
});

// Export the generated hooks for use in components
export const {
  useGetAccountAccessQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useMarkEventStatusMutation,
  useDeleteEventCascadeMutation,
  // Enhanced Data Client hooks
  useListEventsMinimalQuery,
  useListEventsEnhancedQuery,
  useGetSingleEventEnhancedQuery,
} = eventApi;

// Export selectors from the separate file
export * from '../eventSelectors.js';
