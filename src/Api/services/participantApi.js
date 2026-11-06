// Import necessary dependencies
import { createApi } from '@reduxjs/toolkit/query/react';
import * as queries from '../../../Graphql/queries.ts';
import * as mutations from '../../../Graphql/mutations.ts';
import * as subscriptions from '../../../Graphql/subscriptions.ts';
// Data Client imports for hybrid approach
import { getClient, SELECTION_SETS } from '../amplifyClient.js';
import { showToast } from '../../Redux/UI/toastSlice';
import { createReconnectingSubscription } from '../subscriptions/reconnectingSubscription.js';
import { collaboratorApi } from './collaboratorApi.js';
import { eventApi } from './eventApi.js';
import { invalidateEventRoles } from './roleApi.js';
import { track } from '../../Utils/analytics';

// Custom base query function to work with Amplify's GraphQL API
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    // Amplify v6 lança um GraphQLResult {data, errors} quando há erros GraphQL.
    // Partial success só quando ALGUM campo top-level devolveu dados (queries
    // com nulls parciais por field-auth). Falha total — ex.: mutation recusada
    // pelo gate de billing, campo único a null — REJEITA, senão o unwrap()
    // resolvia e a UI mostrava sucesso sem nada ter sido escrito.
    const topLevelFields = error?.data ? Object.values(error.data) : [];
    if (topLevelFields.some((value) => value != null)) {
      console.warn(`[amplifyBaseQuery] Partial success — ${error.errors?.length || 0} GraphQL errors ignored, using valid data.`);
      return { data: error.data };
    }
    return { error: { status: error.statusCode, data: error } };
  }
};

// Column mappings for participant data
const COLUMN_MAPPINGS = {
  name: ['nome', 'name'],
  email: ['email', 'e-mail'],
  phone: ['telefone', 'phone', 'telemóvel'],
  role: ['categoria', 'função', 'role'],
  job: ['profissão', 'cargo', 'job'],
  note: ['nota', 'note', 'observação'],
  hasDependent: ['acompanhante', 'acompanhantes', 'tem acompanhante?', 'possui acompanhante?'],
  dependentCount: ['quantidade', 'qtd', 'quantity', 'Quantidade', 'número', 'número de acompanhantes', 'total de acompanhantes']
};

function mapHeaders(headers) {
  const headerMap = {};
  
  // Remove the first empty element and normalize the headers
  const normalizedHeaders = headers
    .slice(1)
    .map(h => !h ? '' : String(h).toLowerCase().trim());

  // Map each field to its possible names
  for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    const index = normalizedHeaders.findIndex(header => 
      possibleNames.some(name => header.includes(name))
    );
    headerMap[field] = index !== -1 ? index + 1 : null;
  }

  // Validate required columns
  const requiredColumns = ['name'];
  const missingColumns = requiredColumns.filter(col => headerMap[col] === null);
  
  if (missingColumns.length > 0) {
    throw new Error(`Coluna obrigatória não encontrada: ${missingColumns.join(', ')}`);
  }

  return headerMap;
}

// Create the API slice for participants
export const participantApi = createApi({
  reducerPath: 'participantApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Participant', 'Event', 'Dependent'],
  endpoints: (builder) => ({

    // Mutation to create a participant
    // Uses Lambda-based mutation to bypass rules.owner() for collaborators
    // Sets event owner as participant record owner so they retain full access
    createParticipant: builder.mutation({
      query: (participant) => ({
        document: `
          mutation CreateParticipantAsCollaborator(
            $eventId: String!
            $participantName: String
            $participantEmail: String
            $participantPhone: String
            $roleId: String
            $participantStatus: String
            $participantJob: String
            $participantNote: String
            $registrationDate: AWSDateTime
            $dependentsCount: Int
            $documentationType: String
            $documentLast4: String
            $nationality: String
            $residenceCountry: String
            $organization: String
            $emergencyContact: String
            $internalId: String
            $visaRequired: Boolean
            $visaSupport: Boolean
            $arrivalDate: String
            $arrivalTime: String
            $arrivalFlight: String
            $arrivalLayovers: String
            $arrivalAirport: String
            $transferRequired: Boolean
            $transferDetails: String
            $transferCost: Float
            $transferCurrency: String
            $hotel: String
            $roomType: String
            $checkInDate: String
            $checkOutDate: String
            $nights: Int
            $ratePerNight: Float
            $rateCurrency: String
            $accommodationCost: Float
            $departureDate: String
            $departureTime: String
            $departureFlight: String
            $departureAirport: String
            $ticketFare: Float
            $ticketCurrency: String
            $taxesExtras: Float
            $taxesCurrency: String
            $totalTravelCost: Float
            $totalTravelCurrency: String
            $paymentStatus: String
            $bookingReference: String
            $bookingAgency: String
            $dietaryRestriction: String
            $protocol: String
          ) {
            createParticipantAsCollaborator(
              eventId: $eventId
              participantName: $participantName
              participantEmail: $participantEmail
              participantPhone: $participantPhone
              roleId: $roleId
              participantStatus: $participantStatus
              participantJob: $participantJob
              participantNote: $participantNote
              registrationDate: $registrationDate
              dependentsCount: $dependentsCount
              documentationType: $documentationType
              documentLast4: $documentLast4
              nationality: $nationality
              residenceCountry: $residenceCountry
              organization: $organization
              emergencyContact: $emergencyContact
              internalId: $internalId
              visaRequired: $visaRequired
              visaSupport: $visaSupport
              arrivalDate: $arrivalDate
              arrivalTime: $arrivalTime
              arrivalFlight: $arrivalFlight
              arrivalLayovers: $arrivalLayovers
              arrivalAirport: $arrivalAirport
              transferRequired: $transferRequired
              transferDetails: $transferDetails
              transferCost: $transferCost
              transferCurrency: $transferCurrency
              hotel: $hotel
              roomType: $roomType
              checkInDate: $checkInDate
              checkOutDate: $checkOutDate
              nights: $nights
              ratePerNight: $ratePerNight
              rateCurrency: $rateCurrency
              accommodationCost: $accommodationCost
              departureDate: $departureDate
              departureTime: $departureTime
              departureFlight: $departureFlight
              departureAirport: $departureAirport
              ticketFare: $ticketFare
              ticketCurrency: $ticketCurrency
              taxesExtras: $taxesExtras
              taxesCurrency: $taxesCurrency
              totalTravelCost: $totalTravelCost
              totalTravelCurrency: $totalTravelCurrency
              paymentStatus: $paymentStatus
              bookingReference: $bookingReference
              bookingAgency: $bookingAgency
              dietaryRestriction: $dietaryRestriction
              protocol: $protocol
            ) {
              id
              participantName
              participantEmail
              participantPhone
              roleId
              participantStatus
              participantJob
              participantNote
              eventId
              registrationDate
              dependentsCount
              owner
              createdAt
              updatedAt
            }
          }
        `,
        variables: {
          eventId: participant.eventId,
          participantName: participant.participantName,
          participantEmail: participant.participantEmail,
          participantPhone: participant.participantPhone,
          roleId: participant.roleId,
          participantStatus: participant.participantStatus || 'REGISTERED',
          participantJob: participant.participantJob,
          participantNote: participant.participantNote,
          registrationDate: participant.registrationDate || new Date().toISOString(),
          dependentsCount: participant.dependentsCount || 0,
          documentationType: participant.documentationType,
          documentLast4: participant.documentLast4,
          nationality: participant.nationality,
          residenceCountry: participant.residenceCountry,
          organization: participant.organization,
          emergencyContact: participant.emergencyContact,
          internalId: participant.internalId,
          visaRequired: participant.visaRequired,
          visaSupport: participant.visaSupport,
          arrivalDate: participant.arrivalDate,
          arrivalTime: participant.arrivalTime,
          arrivalFlight: participant.arrivalFlight,
          arrivalLayovers: participant.arrivalLayovers,
          arrivalAirport: participant.arrivalAirport,
          transferRequired: participant.transferRequired,
          transferDetails: participant.transferDetails,
          transferCost: participant.transferCost,
          transferCurrency: participant.transferCurrency,
          hotel: participant.hotel,
          roomType: participant.roomType,
          checkInDate: participant.checkInDate,
          checkOutDate: participant.checkOutDate,
          nights: participant.nights,
          ratePerNight: participant.ratePerNight,
          rateCurrency: participant.rateCurrency,
          accommodationCost: participant.accommodationCost,
          departureDate: participant.departureDate,
          departureTime: participant.departureTime,
          departureFlight: participant.departureFlight,
          departureAirport: participant.departureAirport,
          ticketFare: participant.ticketFare,
          ticketCurrency: participant.ticketCurrency,
          taxesExtras: participant.taxesExtras,
          taxesCurrency: participant.taxesCurrency,
          totalTravelCost: participant.totalTravelCost,
          totalTravelCurrency: participant.totalTravelCurrency,
          paymentStatus: participant.paymentStatus,
          bookingReference: participant.bookingReference,
          bookingAgency: participant.bookingAgency,
          dietaryRestriction: participant.dietaryRestriction,
          protocol: participant.protocol,
        },
      }),
      transformResponse: (response) => ({
        createParticipant: response.createParticipantAsCollaborator,
      }),
      // No invalidatesTags for participant list — onQueryStarted handles it optimistically.
      // Only invalidate Event so counters/summaries stay fresh.
      invalidatesTags: (result, error, participant) => [
        { type: 'Event', id: participant.eventId },
        { type: 'Event', id: 'LIST' },
      ],
      onQueryStarted(participant, { dispatch, queryFulfilled }) {
        const tempId = `__temp_${Date.now()}`;

        // 1. Optimistic patch — add to cache immediately
        const patchResult = dispatch(
          participantApi.util.updateQueryData(
            'listParticipantsByEventLambda',
            { eventId: participant.eventId },
            (draft) => {
              if (!draft?.items) return;
              draft.items.unshift({
                ...participant,
                id: tempId,
                __isOptimistic: true,
                participantStatus: participant.participantStatus || 'REGISTERED',
                dependentsCount: participant.dependentsCount || 0,
                dependents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              draft.totalCount = draft.items.length;
            }
          )
        );

        // 2. Background: replace temp with real data on success, undo on error
        queryFulfilled
          .then(({ data }) => {
            const realId = data?.createParticipant?.id;
            if (realId) {
              dispatch(
                participantApi.util.updateQueryData(
                  'listParticipantsByEventLambda',
                  { eventId: participant.eventId },
                  (draft) => {
                    if (!draft?.items) return;
                    const idx = draft.items.findIndex(p => p.id === tempId);
                    if (idx !== -1) {
                      Object.assign(draft.items[idx], data.createParticipant, { __isOptimistic: false });
                    }
                  }
                )
              );
            }
            dispatch(showToast({ message: 'toast.createSuccess', variant: 'success' }));
            track('participant_added', { method: 'manual' });
          })
          .catch((err) => {
            patchResult.undo();
            const apiMessage = err?.error?.data?.errors?.[0]?.message;
            dispatch(showToast({
              message: apiMessage || 'toast.createError',
              variant: 'error',
            }));
          });
      },
    }),

    // Mutation to update a participant's general information
    // Uses Lambda-based mutation to bypass rules.owner() for collaborators
    updateParticipant: builder.mutation({
      query: (participant) => ({
        document: `
          mutation UpdateParticipantAsCollaborator(
            $id: String!
            $eventId: String!
            $participantName: String
            $participantEmail: String
            $participantPhone: String
            $roleId: String
            $participantStatus: String
            $participantJob: String
            $participantNote: String
            $documentationType: String
            $documentLast4: String
            $nationality: String
            $residenceCountry: String
            $organization: String
            $emergencyContact: String
            $internalId: String
            $visaRequired: Boolean
            $visaSupport: Boolean
            $arrivalDate: String
            $arrivalTime: String
            $arrivalFlight: String
            $arrivalLayovers: String
            $arrivalAirport: String
            $transferRequired: Boolean
            $transferDetails: String
            $transferCost: Float
            $transferCurrency: String
            $hotel: String
            $roomType: String
            $checkInDate: String
            $checkOutDate: String
            $nights: Int
            $ratePerNight: Float
            $rateCurrency: String
            $accommodationCost: Float
            $departureDate: String
            $departureTime: String
            $departureFlight: String
            $departureAirport: String
            $ticketFare: Float
            $ticketCurrency: String
            $taxesExtras: Float
            $taxesCurrency: String
            $totalTravelCost: Float
            $totalTravelCurrency: String
            $paymentStatus: String
            $bookingReference: String
            $bookingAgency: String
            $dietaryRestriction: String
            $protocol: String
            $photoUrl: String
          ) {
            updateParticipantAsCollaborator(
              id: $id
              eventId: $eventId
              participantName: $participantName
              participantEmail: $participantEmail
              participantPhone: $participantPhone
              roleId: $roleId
              participantStatus: $participantStatus
              participantJob: $participantJob
              participantNote: $participantNote
              documentationType: $documentationType
              documentLast4: $documentLast4
              nationality: $nationality
              residenceCountry: $residenceCountry
              organization: $organization
              emergencyContact: $emergencyContact
              internalId: $internalId
              visaRequired: $visaRequired
              visaSupport: $visaSupport
              arrivalDate: $arrivalDate
              arrivalTime: $arrivalTime
              arrivalFlight: $arrivalFlight
              arrivalLayovers: $arrivalLayovers
              arrivalAirport: $arrivalAirport
              transferRequired: $transferRequired
              transferDetails: $transferDetails
              transferCost: $transferCost
              transferCurrency: $transferCurrency
              hotel: $hotel
              roomType: $roomType
              checkInDate: $checkInDate
              checkOutDate: $checkOutDate
              nights: $nights
              ratePerNight: $ratePerNight
              rateCurrency: $rateCurrency
              accommodationCost: $accommodationCost
              departureDate: $departureDate
              departureTime: $departureTime
              departureFlight: $departureFlight
              departureAirport: $departureAirport
              ticketFare: $ticketFare
              ticketCurrency: $ticketCurrency
              taxesExtras: $taxesExtras
              taxesCurrency: $taxesCurrency
              totalTravelCost: $totalTravelCost
              totalTravelCurrency: $totalTravelCurrency
              paymentStatus: $paymentStatus
              bookingReference: $bookingReference
              bookingAgency: $bookingAgency
              dietaryRestriction: $dietaryRestriction
              protocol: $protocol
              photoUrl: $photoUrl
            ) {
              id
              participantName
              participantEmail
              participantPhone
              roleId
              participantStatus
              participantJob
              participantNote
              eventId
              registrationDate
              attendedDate
              confirmationDate
              dependentsCount
              photoUrl
              owner
              createdAt
              updatedAt
            }
          }
        `,
        variables: {
          id: participant.id,
          eventId: participant.eventId,
          participantName: participant.participantName,
          participantEmail: participant.participantEmail,
          participantPhone: participant.participantPhone,
          roleId: participant.roleId,
          participantStatus: participant.participantStatus,
          participantJob: participant.participantJob,
          participantNote: participant.participantNote,
          documentationType: participant.documentationType,
          documentLast4: participant.documentLast4,
          nationality: participant.nationality,
          residenceCountry: participant.residenceCountry,
          organization: participant.organization,
          emergencyContact: participant.emergencyContact,
          internalId: participant.internalId,
          visaRequired: participant.visaRequired,
          visaSupport: participant.visaSupport,
          arrivalDate: participant.arrivalDate,
          arrivalTime: participant.arrivalTime,
          arrivalFlight: participant.arrivalFlight,
          arrivalLayovers: participant.arrivalLayovers,
          arrivalAirport: participant.arrivalAirport,
          transferRequired: participant.transferRequired,
          transferDetails: participant.transferDetails,
          transferCost: participant.transferCost,
          transferCurrency: participant.transferCurrency,
          hotel: participant.hotel,
          roomType: participant.roomType,
          checkInDate: participant.checkInDate,
          checkOutDate: participant.checkOutDate,
          nights: participant.nights,
          ratePerNight: participant.ratePerNight,
          rateCurrency: participant.rateCurrency,
          accommodationCost: participant.accommodationCost,
          departureDate: participant.departureDate,
          departureTime: participant.departureTime,
          departureFlight: participant.departureFlight,
          departureAirport: participant.departureAirport,
          ticketFare: participant.ticketFare,
          ticketCurrency: participant.ticketCurrency,
          taxesExtras: participant.taxesExtras,
          taxesCurrency: participant.taxesCurrency,
          totalTravelCost: participant.totalTravelCost,
          totalTravelCurrency: participant.totalTravelCurrency,
          paymentStatus: participant.paymentStatus,
          bookingReference: participant.bookingReference,
          bookingAgency: participant.bookingAgency,
          dietaryRestriction: participant.dietaryRestriction,
          protocol: participant.protocol,
          photoUrl: participant.photoUrl,
        },
      }),
      transformResponse: (response) => ({
        updateParticipant: response.updateParticipantAsCollaborator,
      }),
      // No invalidatesTags for the participant list — onQueryStarted handles it optimistically.
      // Only invalidate Event so counters/summaries stay fresh.
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
        { type: 'Event', id: 'LIST' },
      ],
      onQueryStarted(participant, { dispatch, queryFulfilled }) {
        const { id, eventId } = participant;

        // 1. Optimistic patch — update cache immediately
        const patchResult = dispatch(
          participantApi.util.updateQueryData(
            'listParticipantsByEventLambda',
            { eventId },
            (draft) => {
              if (!draft?.items) return;
              const idx = draft.items.findIndex(p => p.id === id);
              if (idx !== -1) {
                Object.assign(draft.items[idx], {
                  ...participant,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          )
        );

        // 2. Background: wait for server, undo on error
        const backgroundOnlyKeys = new Set(['id', 'eventId', 'photoUrl', 'dependentsCount']);
        const isBackgroundPatch = Object.keys(participant).every(k => backgroundOnlyKeys.has(k));

        queryFulfilled
          .then(() => {
            if (!isBackgroundPatch) {
              dispatch(showToast({ message: 'toast.updateSuccess', variant: 'success' }));
            }
          })
          .catch(() => {
            patchResult.undo();
            dispatch(showToast({ message: 'toast.updateError', variant: 'error' }));
          });
      },
    }),

    // Mutation to delete multiple participants
    deleteParticipants: builder.mutation({
      query: ({ participantIds }) => ({
        document: mutations.deleteParticipants,
        variables: { participantIds }
      }),
      // No invalidatesTags for participant list — onQueryStarted handles it optimistically.
      // Only invalidate Event so counters/summaries stay fresh.
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
        { type: 'Event', id: 'LIST' },
      ],
      onQueryStarted({ participantIds, eventId }, { dispatch, queryFulfilled }) {
        // 1. Optimistic patch — remove from cache immediately
        const patchResult = dispatch(
          participantApi.util.updateQueryData(
            'listParticipantsByEventLambda',
            { eventId },
            (draft) => {
              if (!draft?.items) return;
              draft.items = draft.items.filter(p => !participantIds.includes(p.id));
              draft.totalCount = draft.items.length;
            }
          )
        );

        // 2. Background: wait for server, undo on error
        queryFulfilled
          .then(() => {
            // Os contadores do evento são lidos por outras instâncias createApi
            // (card do /events, perfil do EventDetails) e a invalidação por tags
            // não as atravessa. A Lambda de delete escreve os contadores antes
            // de responder, por isso aqui já se lê o valor certo.
            dispatch(eventApi.util.invalidateTags([{ type: 'Event', id: eventId }]));
            dispatch(collaboratorApi.util.invalidateTags([{ type: 'Event', id: eventId }]));
            dispatch(showToast({ message: 'toast.deleteSuccess', variant: 'success' }));
          })
          .catch(() => {
            patchResult.undo();
            dispatch(showToast({ message: 'toast.deleteError', variant: 'error' }));
          });
      }
    }),

    // Mutation to upload participants from Excel file
    uploadParticipants: builder.mutation({
      query: ({ file, eventId }) => ({
        document: mutations.uploadParticipants,
        variables: {
          eventId,
          file
        }
      }),
      // Bulk import: invalidate to refetch the full list (can't do optimistic for bulk ops)
      invalidatesTags: (result, error, { eventId }) => (
        result?.uploadParticipants?.success
          ? [
              { type: 'Participant', id: `LIST_${eventId}` },
              { type: 'Event', id: eventId },
              { type: 'Event', id: 'LIST' },
            ]
          : []
      ),
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // roleApi é um slice RTK Query separado — o Lambda cria roles novas
          // diretamente na DynamoDB, sem passar pelo roleApi, por isso a lista
          // de roles em cache fica desatualizada sem esta invalidação manual.
          if (data?.uploadParticipants?.success) {
            invalidateEventRoles(dispatch, eventId);
            track('participant_added', { method: 'import' });
          }
        } catch {
          // Import falhou — nada para invalidar
        }
      },
    }),

    // Mutation to import normalized participants (JSON input, no ExcelJS) —
    // primary import path via a serviço externo de normalização por LLM
    // (api-bafatorio); uploadParticipants é o fallback determinístico.
    importNormalizedParticipants: builder.mutation({
      query: ({ eventId, participants }) => ({
        document: mutations.importNormalizedParticipants,
        variables: {
          eventId,
          participants: JSON.stringify(participants),
        }
      }),
      invalidatesTags: (result, error, { eventId }) => (
        result?.importNormalizedParticipants?.success
          ? [
              { type: 'Participant', id: `LIST_${eventId}` },
              { type: 'Event', id: eventId },
              { type: 'Event', id: 'LIST' },
            ]
          : []
      ),
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Mesmo efeito colateral do uploadParticipants (resolveRoleId cria
          // roles novas fora do roleApi) — ver ADR-039.
          if (data?.importNormalizedParticipants?.success) {
            invalidateEventRoles(dispatch, eventId);
            track('participant_added', { method: 'import' });
          }
        } catch {
          // Import falhou — nada para invalidar
        }
      },
    }),

    // Subscription to listen for participant status changes
    subscribeToParticipantStatusChanges: builder.query({
      query: () => ({
        document: subscriptions.onUpdateParticipant,
      }),
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        try {
          await cacheDataLoaded;
          const subscription = createReconnectingSubscription({
            label: 'onUpdateParticipant',
            createObservable: () => getClient().graphql({ query: subscriptions.onUpdateParticipant }),
            next: (result) => {
              const updatedParticipant = result.data.onUpdateParticipant;
              updateCachedData((draft) => {
                if (draft && draft.id === updatedParticipant.id) {
                  Object.assign(draft, updatedParticipant);
                }
              });
            },
          });
          await cacheEntryRemoved;
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error in participant subscription:', error);
        }
      },
    }),

    // Add this new endpoint
    listAllParticipants: builder.query({
      async queryFn(args, api, extraOptions, baseQuery) {
        const allParticipants = [];
        let nextToken = null;
        let page = 0;

        try {
          do {
            const result = await baseQuery({
              document: queries.listParticipants,
              variables: {
                limit: 1000,
                nextToken
              },
            });

            if (result.error) {
              return { error: result.error };
            }

            const response = result.data.listParticipants;
            allParticipants.push(...response.items);
            nextToken = response.nextToken;

          } while (nextToken && ++page < 50);

          return {
            data: {
              items: allParticipants,
              totalCount: allParticipants.length
            }
          };

        } catch (error) {
          console.error('Error fetching all participants:', error);
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: 'Failed to load participants'
            }
          };
        }
      },
      providesTags: ['Participant'],
    }),

    // ========================================
    // NEW: Hybrid Data Client Queries (Fase 3)
    // ========================================

    /**
     * Enhanced query using Data Client with pagination
     * Fetches ALL participants for an event WITH dependents using Participant.list()
     * Handles pagination to overcome the default 100 item limit
     */
    listParticipantsByEventEnhanced: builder.query({
      async queryFn({ eventId }) {
        const dataClient = getClient();

        try {
          const allParticipants = [];
          let nextToken = null;

          // Paginate through all participants for this event
          do {
            const { data: participants, nextToken: token, errors } = await dataClient.models.Participant.list({
              filter: { eventId: { eq: eventId } },
              limit: 1000, // Max limit per request
              nextToken,
              selectionSet: SELECTION_SETS.PARTICIPANT_WITH_DEPENDENTS
            });

            if (errors && errors.length > 0) {
              console.error('[listParticipantsByEventEnhanced] GraphQL errors:', errors);
              return { error: { status: 'GRAPHQL_ERROR', data: errors } };
            }

            // Add computed dependentsCount from actual dependents array
            const participantsWithCount = (participants || []).map(participant => ({
              ...participant,
              dependentsCount: participant.dependents?.length || 0
            }));

            allParticipants.push(...participantsWithCount);
            nextToken = token;

            console.log(`[listParticipantsByEventEnhanced] Fetched ${participants?.length || 0} participants, total: ${allParticipants.length}, hasMore: ${!!nextToken}`);

          } while (nextToken);

          console.log(`[listParticipantsByEventEnhanced] Total participants loaded: ${allParticipants.length}`);

          return {
            data: {
              items: allParticipants,
              totalCount: allParticipants.length
            }
          };
        } catch (error) {
          console.error('[listParticipantsByEventEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'Participant', id: `LIST_${eventId}` },
        { type: 'Dependent', id: `LIST_EVENT_${eventId}` },
        { type: 'Event', id: eventId },
      ],
    }),

    /**
     * Lambda-based query to list participants for an event (collaborator-aware).
     * Bypasses rules.owner() by querying DynamoDB directly after access check.
     * Returns participants with nested dependents.
     */
    listParticipantsByEventLambda: builder.query({
      query: ({ eventId }) => ({
        document: `
          query ListEventParticipantsQuery($eventId: String!) {
            listEventParticipantsQuery(eventId: $eventId) {
              items {
                id
                participantName
                participantEmail
                participantPhone
                roleId
                participantStatus
                participantJob
                participantNote
                registrationDate
                attendedDate
                confirmationDate
                eventId
                dependentsCount
                documentationType
                documentLast4
                nationality
                residenceCountry
                organization
                emergencyContact
                internalId
                visaRequired
                visaSupport
                arrivalDate
                arrivalTime
                arrivalFlight
                arrivalLayovers
                arrivalAirport
                transferRequired
                transferDetails
                transferCost
                transferCurrency
                hotel
                roomType
                checkInDate
                checkOutDate
                nights
                ratePerNight
                rateCurrency
                accommodationCost
                departureDate
                departureTime
                departureFlight
                departureAirport
                ticketFare
                ticketCurrency
                taxesExtras
                taxesCurrency
                totalTravelCost
                totalTravelCurrency
                paymentStatus
                bookingReference
                bookingAgency
                dietaryRestriction
                protocol
                photoUrl
                owner
                createdAt
                updatedAt
                dependents {
                  id
                  name
                  age
                  participantId
                  eventId
                  status
                  attendedDate
                  createdAt
                  updatedAt
                }
              }
              totalCount
            }
          }
        `,
        variables: { eventId },
      }),
      transformResponse: (response) => {
        const result = response.listEventParticipantsQuery;
        const items = (result?.items || []).map((participant) => ({
          ...participant,
          dependentsCount: participant.dependentsCount ?? (participant.dependents?.length || 0),
        }));
        return {
          items,
          totalCount: result?.totalCount || items.length,
        };
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'Participant', id: `LIST_${eventId}` },
        { type: 'Dependent', id: `LIST_EVENT_${eventId}` },
        { type: 'Event', id: eventId },
      ],
    }),

    /**
     * Get single participant with dependents using Data Client
     * Fetches participant WITH all related dependents in one query
     */
    getParticipantEnhanced: builder.query({
      async queryFn({ id }) {
        console.log(`🚀 [getParticipantEnhanced] Starting query for participant ${id}...`);
        const startTime = performance.now();
        const dataClient = getClient();
        
        try {
          const { data: participant, errors } = await dataClient.models.Participant.get(
            { id },
            { selectionSet: SELECTION_SETS.PARTICIPANT_WITH_DEPENDENTS }
          );
          
          const endTime = performance.now();
          const duration = (endTime - startTime).toFixed(2);
          
          console.log(`✅ [getParticipantEnhanced] Query completed in ${duration}ms`);
          if (participant) {
            console.log(`👥 [getParticipantEnhanced] Participant: ${participant.participantName}`);
            console.log(`👨‍👩‍👧 [getParticipantEnhanced] Dependents loaded: ${participant.dependents?.length || 0}`);
          }

          if (errors) {
            console.error('[getParticipantEnhanced] GraphQL errors:', errors);
            return { error: { status: 'GRAPHQL_ERROR', data: errors } };
          }

          if (!participant) {
            return { error: { status: 'NOT_FOUND', message: `Participant ${id} not found` } };
          }

          return { data: participant };
        } catch (error) {
          console.error('[getParticipantEnhanced] Error:', error);
          return { error: { status: 'FETCH_ERROR', message: error.message } };
        }
      },
      providesTags: (result, error, { id }) => [
        { type: 'Participant', id },
        { type: 'Dependent', id: `LIST_PARTICIPANT_${id}` },
      ],
    }),

    /**
     * Confirm participant/dependent presence via Lambda (collaborator-aware).
     * Bypasses rules.owner() — uses access control in the Lambda handler.
     * Handles both participant status update and batch dependent check-in in a single call.
     */
    confirmPresence: builder.mutation({
      query: ({ eventId, participantId, participantStatus, attendedDate, dependentUpdates, language }) => ({
        document: `
          mutation ConfirmParticipant(
            $eventId: String!
            $participantId: String
            $participantStatus: String
            $attendedDate: String
            $dependentUpdates: AWSJSON
            $language: ConfirmParticipantLanguage
          ) {
            confirmParticipant(
              eventId: $eventId
              participantId: $participantId
              participantStatus: $participantStatus
              attendedDate: $attendedDate
              dependentUpdates: $dependentUpdates
              language: $language
            ) {
              success
              message
              updatedDependentsCount
            }
          }
        `,
        variables: {
          eventId,
          participantId,
          participantStatus,
          attendedDate,
          dependentUpdates: dependentUpdates ? JSON.stringify(dependentUpdates) : undefined,
          language,
        }
      }),
      transformResponse: (response) => response.confirmParticipant,
      // No participant-list invalidation — onQueryStarted patches the
      // listParticipantsByEventLambda cache optimistically to the final ATTENDED state,
      // so a refetch would only fight that state (eventual-consistency flicker). The
      // Dependent/single-participant tags stay so OTHER screens still refresh.
      invalidatesTags: (result, error, { participantId }) => {
        const tags = [
          { type: 'Dependent', id: 'LIST_ALL' },
          { type: 'Dependent', id: 'LIST_BY_PARTICIPANTS' },
        ];
        if (participantId) {
          tags.push({ type: 'Participant', id: participantId });
        }
        return tags;
      },
      onQueryStarted({ eventId, participantId, participantStatus, attendedDate, dependentUpdates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          participantApi.util.updateQueryData(
            'listParticipantsByEventLambda',
            { eventId },
            (draft) => {
              if (!draft?.items) return;

              if (participantId) {
                const participant = draft.items.find((item) => item.id === participantId);
                if (participant) {
                  if (participantStatus) participant.participantStatus = participantStatus;
                  if (attendedDate) participant.attendedDate = attendedDate;
                }
              }

              if (Array.isArray(dependentUpdates) && dependentUpdates.length > 0) {
                const updatesById = new Map(dependentUpdates.map((d) => [d.id, d]));
                for (const item of draft.items) {
                  if (!item.dependents) continue;
                  for (const dependent of item.dependents) {
                    const update = updatesById.get(dependent.id);
                    if (update) {
                      if (update.status) dependent.status = update.status;
                      if (update.attendedDate) dependent.attendedDate = update.attendedDate;
                    }
                  }
                }
              }
            }
          )
        );

        queryFulfilled
          .then(({ data }) => {
            // Hard rollback on a soft `{ success: false }` (handler returns that without
            // throwing for validation/access failures).
            if (!data?.success) {
              patchResult.undo();
              return;
            }
            // The handler updates each dependent independently and still reports success when
            // only some land. If fewer than requested were written, the optimistic patch
            // over-marked — reconcile from the server (rare path; common path stays flicker-free).
            const requested = Array.isArray(dependentUpdates) ? dependentUpdates.length : 0;
            if (requested > 0 && data.updatedDependentsCount !== requested) {
              dispatch(participantApi.util.invalidateTags([{ type: 'Participant', id: `LIST_${eventId}` }]));
            }
          })
          .catch(() => patchResult.undo());
      },
    }),
  }),
});



// Export generated hooks for use in components
export const {
  useListAllParticipantsQuery,
  useCreateParticipantMutation,
  useUpdateParticipantMutation,
  useDeleteParticipantsMutation,
  useUploadParticipantsMutation,
  useImportNormalizedParticipantsMutation,
  useSubscribeToParticipantStatusChangesQuery,
  // Enhanced Data Client hooks
  useListParticipantsByEventEnhancedQuery,
  useGetParticipantEnhancedQuery,
  // Lambda-based hooks (collaborator-aware)
  useListParticipantsByEventLambdaQuery,
  useLazyListParticipantsByEventLambdaQuery,
  useConfirmPresenceMutation,
} = participantApi;

/**
 * Cross-slice invalidation helper — call from another api slice's onQueryStarted
 * whenever its Lambda changes a value participantApi caches on the Participant
 * record itself (e.g. dependentsCount) without going through participantApi
 * (e.g. dependentApi's create/update/delete). Centralizes the tag shapes so
 * callers never hand-roll them.
 */
export const invalidateParticipant = (dispatch, { participantId, eventId } = {}) => {
  const tags = [];
  if (participantId) tags.push({ type: 'Participant', id: participantId });
  if (eventId) tags.push({ type: 'Participant', id: `LIST_${eventId}` });
  if (tags.length > 0) dispatch(participantApi.util.invalidateTags(tags));
};

// Export selectors from the separate file
export * from './participantSelectors';
export { mapHeaders };
