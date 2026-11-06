import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';

// Custom base query for Amplify GraphQL (same pattern as collaboratorApi)
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    const errorMessage = error?.message || JSON.stringify(error);
    return { error: { status: 'GRAPHQL_ERROR', message: errorMessage, data: error } };
  }
};

// GraphQL documents for Lambda-backed role operations

const GET_EVENT_ROLES = /* GraphQL */ `
  query GetEventRoles($eventId: String!) {
    getEventRoles(eventId: $eventId) {
      items {
        id
        eventId
        name
        color
        owner
        createdAt
        updatedAt
      }
    }
  }
`;

const CREATE_EVENT_ROLE = /* GraphQL */ `
  mutation CreateEventRole($eventId: String!, $name: String!) {
    createEventRole(eventId: $eventId, name: $name) {
      id
      eventId
      name
      owner
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_EVENT_ROLE = /* GraphQL */ `
  mutation UpdateEventRole($eventId: String!, $roleId: String!, $name: String!, $color: String) {
    updateEventRole(eventId: $eventId, roleId: $roleId, name: $name, color: $color) {
      id
      eventId
      name
      color
      owner
      createdAt
      updatedAt
    }
  }
`;

const DELETE_EVENT_ROLE_VALIDATED = /* GraphQL */ `
  mutation DeleteEventRoleValidated($eventId: String!, $roleId: String!) {
    deleteEventRoleValidated(eventId: $eventId, roleId: $roleId) {
      success
      participantCount
    }
  }
`;

export const roleApi = createApi({
  reducerPath: 'roleApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Role'],
  endpoints: (builder) => ({
    /**
     * List roles for a specific event (Lambda-backed, collaborator-aware).
     * @param {string} eventId
     */
    listEventRoles: builder.query({
      query: ({ eventId }) => ({
        document: GET_EVENT_ROLES,
        variables: { eventId },
      }),
      transformResponse: (response) => response.getEventRoles?.items || [],
      providesTags: (result, error, { eventId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Role', id })),
              { type: 'Role', id: `LIST_${eventId}` },
            ]
          : [{ type: 'Role', id: `LIST_${eventId}` }],
    }),

    /**
     * Create a new role for an event (Lambda-backed, OWNER/CO_MANAGER only).
     * @param {string} eventId
     * @param {string} name
     */
    createEventRole: builder.mutation({
      query: ({ eventId, name }) => ({
        document: CREATE_EVENT_ROLE,
        variables: { eventId, name },
      }),
      transformResponse: (response) => response.createEventRole,
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Role', id: `LIST_${eventId}` },
      ],
    }),

    /**
     * Update a role (rename / highlight color) — Lambda-backed, OWNER/CO_MANAGER only.
     * @param {string} eventId
     * @param {string} roleId
     * @param {string} name
     * @param {string|null} [color] palette key; omit to keep, '' to reset to automatic
     */
    updateEventRole: builder.mutation({
      query: ({ eventId, roleId, name, color }) => ({
        document: UPDATE_EVENT_ROLE,
        variables: { eventId, roleId, name, ...(color !== undefined && { color }) },
      }),
      transformResponse: (response) => {
        const data = response?.updateEventRole;
        if (!data || !data.id) {
          throw new Error('Invalid response from server: missing role data');
        }
        return data;
      },
      invalidatesTags: (result, error, { roleId, eventId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: `LIST_${eventId}` },
      ],
    }),

    /**
     * Delete a role with participant validation — Lambda-backed.
     * Blocks deletion if participants are assigned; returns { success, participantCount }.
     * @param {string} eventId
     * @param {string} roleId
     */
    deleteEventRoleValidated: builder.mutation({
      query: ({ eventId, roleId }) => ({
        document: DELETE_EVENT_ROLE_VALIDATED,
        variables: { eventId, roleId },
      }),
      transformResponse: (response) => {
        const data = response?.deleteEventRoleValidated;
        if (data === null || data === undefined || typeof data.success !== 'boolean') {
          throw new Error('Invalid response from server: missing deletion status');
        }
        return data;
      },
      // Only invalidate cache if deletion was successful
      invalidatesTags: (result, error, { roleId, eventId }) =>
        result?.success
          ? [{ type: 'Role', id: roleId }, { type: 'Role', id: `LIST_${eventId}` }]
          : [],
    }),

  }),
});

export const {
  useListEventRolesQuery,
  useLazyListEventRolesQuery,
  useCreateEventRoleMutation,
  useUpdateEventRoleMutation,
  useDeleteEventRoleValidatedMutation,
} = roleApi;

/**
 * Cross-slice invalidation helper — call from another api slice's onQueryStarted
 * whenever its Lambda can create/rename a Role as a side effect (e.g. import,
 * external sync). Centralizes the LIST tag shape so callers never hand-roll it.
 */
export const invalidateEventRoles = (dispatch, eventId) => {
  if (!eventId) return;
  dispatch(roleApi.util.invalidateTags([{ type: 'Role', id: `LIST_${eventId}` }]));
};
