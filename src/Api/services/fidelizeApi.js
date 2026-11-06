import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';
import { invalidateEventRoles } from './roleApi';

const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    const errMsg = error?.errors?.[0]?.message || error?.message || JSON.stringify(error);
    console.error('[fidelizeApi] GraphQL Error:', errMsg, error);
    return { error: { status: error.statusCode, data: error, message: errMsg, errors: error.errors } };
  }
};

const SAVE_FIDELIZE_API_KEY = /* GraphQL */ `
  mutation SaveFidelizeApiKey($apiKey: String!) {
    saveFidelizeApiKey(apiKey: $apiKey) {
      success
      error
    }
  }
`;

const SYNC_FIDELIZE_PARTICIPANTS = /* GraphQL */ `
  mutation SyncFidelizeParticipants($eventId: String!, $templateIds: [Int], $page: Int) {
    syncFidelizeParticipants(eventId: $eventId, templateIds: $templateIds, page: $page) {
      success
      created
      updated
      skipped
      totalCards
      errors
      hasMore
      nextPage
    }
  }
`;

export const fidelizeApi = createApi({
  reducerPath: 'fidelizeApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['FidelizeIntegration'],
  endpoints: (builder) => ({
    saveFidelizeApiKey: builder.mutation({
      query: ({ apiKey }) => ({
        document: SAVE_FIDELIZE_API_KEY,
        variables: { apiKey },
      }),
      transformResponse: (response) => response.saveFidelizeApiKey,
      invalidatesTags: ['FidelizeIntegration'],
    }),

    syncFidelizeParticipants: builder.mutation({
      query: ({ eventId, templateIds, page }) => ({
        document: SYNC_FIDELIZE_PARTICIPANTS,
        variables: { eventId, templateIds, page },
      }),
      transformResponse: (response) => response.syncFidelizeParticipants,
      invalidatesTags: ['FidelizeIntegration'],
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Invalidate role cache so new roles created by the Lambda are visible
          if (data?.created > 0) {
            invalidateEventRoles(dispatch, eventId);
          }
        } catch {
          // Sync failed — nothing to invalidate
        }
      },
    }),
  }),
});

export const {
  useSaveFidelizeApiKeyMutation,
  useSyncFidelizeParticipantsMutation,
} = fidelizeApi;
