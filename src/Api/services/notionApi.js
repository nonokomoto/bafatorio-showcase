import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';

const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[notionApi] GraphQL Error:', error.message || error);
    return { error: { status: 'GRAPHQL_ERROR', message: error.message, data: error } };
  }
};

const EXCHANGE_NOTION_TOKEN = /* GraphQL */ `
  mutation ExchangeNotionToken($code: String!, $redirectUri: String!) {
    exchangeNotionToken(code: $code, redirectUri: $redirectUri) {
      success
      workspaceName
      error
    }
  }
`;

const LIST_NOTION_PAGES = /* GraphQL */ `
  query ListNotionPages($query: String, $cursor: String) {
    listNotionPages(query: $query, cursor: $cursor) {
      pages {
        id
        title
        icon
        lastEditedAt
        url
        type
        propertyCount
        subtitle
      }
      nextCursor
      hasMore
      error
    }
  }
`;

const IMPORT_NOTION_PAGES = /* GraphQL */ `
  mutation ImportNotionPages($eventId: String!, $pageIds: [String!]!, $folderId: String!) {
    importNotionPages(eventId: $eventId, pageIds: $pageIds, folderId: $folderId) {
      success
      imported
      failed
      documents {
        id
        title
        notionPageId
      }
      errors
    }
  }
`;

const CHECK_NOTION_UPDATES = /* GraphQL */ `
  query CheckNotionUpdates($eventId: String!, $folderId: String!) {
    checkNotionUpdates(eventId: $eventId, folderId: $folderId) {
      updates {
        id
        notionPageId
        title
        s3Key
        notionLastEditedAt
        storedLastEditedAt
      }
      total
      outdated
      error
    }
  }
`;

export const notionApi = createApi({
  reducerPath: 'notionApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['NotionConnection', 'NotionPages'],
  endpoints: (builder) => ({
    exchangeNotionToken: builder.mutation({
      query: ({ code, redirectUri }) => ({
        document: EXCHANGE_NOTION_TOKEN,
        variables: { code, redirectUri },
      }),
      transformResponse: (response) => response.exchangeNotionToken,
      invalidatesTags: ['NotionConnection'],
    }),

    listNotionPages: builder.query({
      query: ({ query, cursor } = {}) => ({
        document: LIST_NOTION_PAGES,
        variables: { query: query || null, cursor: cursor || null },
      }),
      transformResponse: (response) => response.listNotionPages,
      providesTags: ['NotionPages'],
    }),

    importNotionPages: builder.mutation({
      query: ({ eventId, pageIds, folderId }) => ({
        document: IMPORT_NOTION_PAGES,
        variables: { eventId, pageIds, folderId },
      }),
      transformResponse: (response) => response.importNotionPages,
      invalidatesTags: ['NotionPages'],
    }),

    checkNotionUpdates: builder.query({
      query: ({ eventId, folderId }) => ({
        document: CHECK_NOTION_UPDATES,
        variables: { eventId, folderId },
      }),
      transformResponse: (response) => response.checkNotionUpdates,
    }),
  }),
});

export const {
  useExchangeNotionTokenMutation,
  useLazyListNotionPagesQuery,
  useImportNotionPagesMutation,
  useLazyCheckNotionUpdatesQuery,
} = notionApi;
