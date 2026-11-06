import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';

// Custom base query for Amplify GraphQL (same pattern as roleApi)
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[folderApi] GraphQL Error:', error.message || error);
    return { error: { status: 'GRAPHQL_ERROR', message: error.message, data: error } };
  }
};

// GraphQL documents for Lambda-backed folder operations (ADR-021)

const GET_EVENT_FOLDERS = /* GraphQL */ `
  query GetEventFolders($eventId: String!) {
    getEventFolders(eventId: $eventId) {
      items {
        id
        eventId
        name
        description
        color
        icon
        order
        parentFolderId
        isDefault
        owner
        createdAt
        updatedAt
      }
    }
  }
`;

const CREATE_EVENT_FOLDER = /* GraphQL */ `
  mutation CreateEventFolder(
    $eventId: String!
    $name: String!
    $description: String
    $color: String
    $order: Int
    $parentFolderId: String
    $isDefault: Boolean
  ) {
    createEventFolder(
      eventId: $eventId
      name: $name
      description: $description
      color: $color
      order: $order
      parentFolderId: $parentFolderId
      isDefault: $isDefault
    ) {
      id
      eventId
      name
      description
      color
      icon
      order
      parentFolderId
      isDefault
      owner
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_EVENT_FOLDER = /* GraphQL */ `
  mutation UpdateEventFolder(
    $id: String!
    $eventId: String!
    $name: String
    $description: String
    $color: String
    $order: Int
  ) {
    updateEventFolder(
      id: $id
      eventId: $eventId
      name: $name
      description: $description
      color: $color
      order: $order
    ) {
      id
      eventId
      name
      description
      color
      icon
      order
      parentFolderId
      isDefault
      owner
      createdAt
      updatedAt
    }
  }
`;

const DELETE_EVENT_FOLDER = /* GraphQL */ `
  mutation DeleteEventFolder($id: String!, $eventId: String!) {
    deleteEventFolder(id: $id, eventId: $eventId) {
      success
      id
    }
  }
`;

// Create the API slice for document folders
export const folderApi = createApi({
  reducerPath: 'folderApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['DocumentFolder'],
  endpoints: (builder) => ({
    /**
     * List folders for a specific event (Lambda-backed, collaborator-aware).
     * Returns folders filtered by user's event role.
     */
    listFoldersByEventId: builder.query({
      query: ({ eventId }) => ({
        document: GET_EVENT_FOLDERS,
        variables: { eventId },
      }),
      transformResponse: (response) => {
        if (!response?.getEventFolders?.items) return { items: [] };
        return {
          items: response.getEventFolders.items,
        };
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'DocumentFolder', id: `LIST_${eventId}` },
        ...(result?.items?.map(folder => ({ type: 'DocumentFolder', id: folder.id })) || []),
      ],
    }),

    /**
     * Create a new folder in an event (Lambda-backed).
     * OWNER, CO_MANAGER, STAFF_LOGISTICS can create.
     * Supports isDefault flag for idempotent "General" folder creation.
     */
    createFolder: builder.mutation({
      query: ({ eventId, name, description, color, order, parentFolderId, isDefault }) => ({
        document: CREATE_EVENT_FOLDER,
        variables: { eventId, name, description, color, order, parentFolderId, isDefault },
      }),
      transformResponse: (response) => response.createEventFolder,
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'DocumentFolder', id: `LIST_${eventId}` },
      ],
    }),

    /**
     * Update a folder in an event (Lambda-backed).
     * OWNER: any folder. CO_MANAGER/STAFF_LOGISTICS: own folders only.
     */
    updateFolder: builder.mutation({
      query: ({ id, eventId, name, description, color, order }) => ({
        document: UPDATE_EVENT_FOLDER,
        variables: { id, eventId, name, description, color, order },
      }),
      transformResponse: (response) => response.updateEventFolder,
      invalidatesTags: (result, error, { id, eventId }) => [
        { type: 'DocumentFolder', id },
        { type: 'DocumentFolder', id: `LIST_${eventId}` },
      ],
    }),

    /**
     * Delete a folder from an event (Lambda-backed).
     * Cannot delete default (General) folder.
     * OWNER: any folder. CO_MANAGER/STAFF_LOGISTICS: own folders only.
     */
    deleteFolder: builder.mutation({
      query: ({ id, eventId }) => ({
        document: DELETE_EVENT_FOLDER,
        variables: { id, eventId },
      }),
      transformResponse: (response) => response.deleteEventFolder,
      invalidatesTags: (result, error, { id, eventId }) => [
        { type: 'DocumentFolder', id },
        { type: 'DocumentFolder', id: `LIST_${eventId}` },
      ],
    }),
  }),
});

// Export the generated hooks for use in components
export const {
  useListFoldersByEventIdQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} = folderApi;
