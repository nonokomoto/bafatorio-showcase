/**
 * @file collaboratorApi.js
 * @description RTK Query API for collaborator management
 * Implements the collaboration endpoints defined in ACCESS_LEVELS_STRATEGY.md
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';

// Custom base query for Amplify GraphQL
const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[amplifyBaseQuery] GraphQL Error:', error.message || error);
    return { error: { status: error.statusCode, data: error, message: error.message, errors: error.errors } };
  }
};

// GraphQL documents for collaborator operations
const INVITE_COLLABORATOR = /* GraphQL */ `
  mutation InviteCollaborator(
    $eventId: String!
    $email: String!
    $role: InviteCollaboratorRole
    $sharedFolderIds: [String]
    $sharedSupplierIds: [String]
    $language: InviteCollaboratorLanguage
  ) {
    inviteCollaborator(
      eventId: $eventId
      email: $email
      role: $role
      sharedFolderIds: $sharedFolderIds
      sharedSupplierIds: $sharedSupplierIds
      language: $language
    ) {
      id
      eventId
      userEmail
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      createdAt
      updatedAt
    }
  }
`;

const ACCEPT_INVITATION = /* GraphQL */ `
  mutation AcceptInvitation($invitationId: String!) {
    acceptInvitation(invitationId: $invitationId) {
      id
      eventId
      userId
      userEmail
      userName
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      acceptedAt
      createdAt
      updatedAt
    }
  }
`;

const DECLINE_INVITATION = /* GraphQL */ `
  mutation DeclineInvitation($invitationId: String!) {
    declineInvitation(invitationId: $invitationId) {
      id
      eventId
      userEmail
      role
      status
      invitedBy
      invitedAt
      updatedAt
    }
  }
`;

const REVOKE_COLLABORATOR = /* GraphQL */ `
  mutation RevokeCollaborator($collaboratorId: String!) {
    revokeCollaborator(collaboratorId: $collaboratorId)
  }
`;

const UPDATE_COLLABORATOR_ROLE = /* GraphQL */ `
  mutation UpdateCollaboratorRole(
    $collaboratorId: String!
    $newRole: String!
  ) {
    updateCollaboratorRole(
      collaboratorId: $collaboratorId
      newRole: $newRole
    ) {
      id
      eventId
      userId
      userEmail
      userName
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      acceptedAt
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_COLLABORATOR_FOLDERS = /* GraphQL */ `
  mutation UpdateCollaboratorFolders(
    $collaboratorId: String!
    $sharedFolderIds: [String]!
  ) {
    updateCollaboratorFolders(
      collaboratorId: $collaboratorId
      sharedFolderIds: $sharedFolderIds
    ) {
      id
      eventId
      userId
      userEmail
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      acceptedAt
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_COLLABORATOR_SUPPLIERS = /* GraphQL */ `
  mutation UpdateCollaboratorSuppliers(
    $collaboratorId: String!
    $sharedSupplierIds: [String]!
  ) {
    updateCollaboratorSuppliers(
      collaboratorId: $collaboratorId
      sharedSupplierIds: $sharedSupplierIds
    ) {
      id
      eventId
      userId
      userEmail
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      acceptedAt
      createdAt
      updatedAt
    }
  }
`;

const LIST_MY_PENDING_INVITATIONS = /* GraphQL */ `
  query ListMyPendingInvitations {
    listMyPendingInvitations {
      id
      eventId
      userEmail
      role
      sharedFolderIds
      sharedSupplierIds
      status
      invitedBy
      invitedAt
      createdAt
    }
  }
`;

const LIST_MY_COLLABORATED_EVENTS = /* GraphQL */ `
  query ListMyCollaboratedEvents {
    listMyCollaboratedEvents {
      userRole
      event {
        id
        eventTitle
        eventDateType
        eventStartDate
        eventEndDate
        eventSpecificDates
        eventTime
        eventCreationDate
        eventLocation
        eventStatus
        eventType
        categories
        budget
        participantCount
        dependentCount
        totalRegistrations
      }
    }
  }
`;

const GET_EVENT_AS_COLLABORATOR = /* GraphQL */ `
  query GetEventAsCollaborator($eventId: String!) {
    getEventAsCollaborator(eventId: $eventId) {
      userRole
      sharedFolderIds
      sharedSupplierIds
      canViewTeamSchedule
      access {
        planKey
        writable
        reason
        participantLimit
      }
      event {
        id
        eventTitle
        eventManager
        eventManagerEmail
        eventManagerPhone
        eventLocation
        eventDateType
        eventStartDate
        eventEndDate
        eventSpecificDates
        eventTime
        eventCreationDate
        eventStatus
        eventType
        organizerId
        description
        categories
        budget
        currency
        committedExpenses
        effectiveExpenses
        participantCount
        dependentCount
        totalRegistrations
        owner
        createdAt
        updatedAt
      }
    }
  }
`;

const LIST_EVENT_COLLABORATORS = /* GraphQL */ `
  query GetEventCollaborators($eventId: String!) {
    getEventCollaborators(eventId: $eventId) {
      items {
        id
        eventId
        userId
        userEmail
        userName
        role
        sharedFolderIds
        sharedSupplierIds
        canViewTeamSchedule
        status
        invitedBy
        invitedAt
        acceptedAt
        createdAt
        updatedAt
      }
    }
  }
`;

const UPDATE_COLLABORATOR_SCHEDULE_ACCESS = /* GraphQL */ `
  mutation UpdateCollaboratorScheduleAccess(
    $collaboratorId: String!
    $canViewTeamSchedule: Boolean!
  ) {
    updateCollaboratorScheduleAccess(
      collaboratorId: $collaboratorId
      canViewTeamSchedule: $canViewTeamSchedule
    ) {
      id
      eventId
      userId
      role
      canViewTeamSchedule
      updatedAt
    }
  }
`;

/**
 * Collaborator API slice
 * Provides endpoints for managing event collaborators per ACCESS_LEVELS_STRATEGY.md
 */
export const collaboratorApi = createApi({
  reducerPath: 'collaboratorApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Collaborator', 'Invitation'],
  endpoints: (builder) => ({
    // ========== QUERIES ==========

    /**
     * List pending invitations for the current user
     * Uses the user's email from Cognito to find matching invitations
     */
    listMyPendingInvitations: builder.query({
      query: () => ({
        document: LIST_MY_PENDING_INVITATIONS,
      }),
      transformResponse: (response) => response.listMyPendingInvitations || [],
      providesTags: ['Invitation'],
    }),

    /**
     * List events where the current user is an accepted collaborator
     */
    listMyCollaboratedEvents: builder.query({
      query: () => ({
        document: LIST_MY_COLLABORATED_EVENTS,
      }),
      transformResponse: (response) =>
        response.listMyCollaboratedEvents || [],
      providesTags: ['Collaborator'],
    }),

    /**
     * Get a single event if user is owner or collaborator
     * Returns event data along with user's role and shared folder IDs
     * @param {string} eventId - The event ID
     */
    getEventAsCollaborator: builder.query({
      query: ({ eventId }) => ({
        document: GET_EVENT_AS_COLLABORATOR,
        variables: { eventId },
      }),
      transformResponse: (response) => response.getEventAsCollaborator || null,
      providesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
      ],
    }),

    /**
     * List all collaborators for a specific event
     * @param {string} eventId - The event ID
     */
    listEventCollaborators: builder.query({
      query: ({ eventId }) => ({
        document: LIST_EVENT_COLLABORATORS,
        variables: { eventId },
      }),
      transformResponse: (response) => {
        return response.getEventCollaborators?.items || [];
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'Collaborator', id: eventId },
        { type: 'Collaborator', id: 'LIST' },
      ],
    }),

    // ========== MUTATIONS ==========

    /**
     * Invite a collaborator to an event
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - OWNER can invite CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS
     * - CO_MANAGER can only invite Staff roles
     *
     * @param {string} eventId - The event ID
     * @param {string} email - Email of the person to invite
     * @param {string} role - CO_MANAGER, STAFF_CHECKIN, or STAFF_LOGISTICS
     * @param {string[]} sharedFolderIds - Folder IDs to share (only for CO_MANAGER)
     */
    inviteCollaborator: builder.mutation({
      query: ({ eventId, email, role, sharedFolderIds, sharedSupplierIds, language }) => ({
        document: INVITE_COLLABORATOR,
        variables: { eventId, email, role, sharedFolderIds, sharedSupplierIds, language },
      }),
      transformResponse: (response) => response.inviteCollaborator,
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Collaborator', id: eventId },
        { type: 'Collaborator', id: 'LIST' },
      ],
    }),

    /**
     * Accept a pending invitation
     * Sets status to ACCEPTED and associates the user
     *
     * @param {string} invitationId - The invitation ID to accept
     */
    acceptInvitation: builder.mutation({
      query: ({ invitationId }) => ({
        document: ACCEPT_INVITATION,
        variables: { invitationId },
      }),
      transformResponse: (response) => response.acceptInvitation,
      invalidatesTags: ['Invitation', 'Collaborator'],
    }),

    /**
     * Decline a pending invitation
     * Sets status to DECLINED
     *
     * @param {string} invitationId - The invitation ID to decline
     */
    declineInvitation: builder.mutation({
      query: ({ invitationId }) => ({
        document: DECLINE_INVITATION,
        variables: { invitationId },
      }),
      transformResponse: (response) => response.declineInvitation,
      invalidatesTags: ['Invitation'],
    }),

    /**
     * Revoke/remove a collaborator from an event
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - OWNER can remove anyone
     * - CO_MANAGER can remove Staff only
     *
     * @param {string} collaboratorId - The collaborator record ID to revoke
     */
    revokeCollaborator: builder.mutation({
      query: ({ collaboratorId }) => ({
        document: REVOKE_COLLABORATOR,
        variables: { collaboratorId },
      }),
      transformResponse: (response) => response.revokeCollaborator,
      invalidatesTags: ['Collaborator'],
    }),

    /**
     * Update shared folders for a CO_MANAGER collaborator
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - Only OWNER can update folder sharing
     * - Only applies to CO_MANAGER role
     *
     * @param {string} collaboratorId - The collaborator record ID
     * @param {string[]} sharedFolderIds - Array of folder IDs to share
     */
    updateCollaboratorFolders: builder.mutation({
      query: ({ collaboratorId, sharedFolderIds }) => ({
        document: UPDATE_COLLABORATOR_FOLDERS,
        variables: { collaboratorId, sharedFolderIds },
      }),
      transformResponse: (response) => response.updateCollaboratorFolders,
      invalidatesTags: (result, error, { collaboratorId }) => [
        { type: 'Collaborator', id: collaboratorId },
        'Collaborator',
      ],
    }),

    /**
     * Update shared suppliers for a collaborator
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - Only OWNER can update supplier sharing
     * - Applies to CO_MANAGER and STAFF_LOGISTICS roles
     *
     * @param {string} collaboratorId - The collaborator record ID
     * @param {string[]} sharedSupplierIds - Array of supplier IDs to share
     */
    updateCollaboratorSuppliers: builder.mutation({
      query: ({ collaboratorId, sharedSupplierIds }) => ({
        document: UPDATE_COLLABORATOR_SUPPLIERS,
        variables: { collaboratorId, sharedSupplierIds },
      }),
      transformResponse: (response) => response.updateCollaboratorSuppliers,
      invalidatesTags: (result, error, { collaboratorId }) => [
        { type: 'Collaborator', id: collaboratorId },
        'Collaborator',
      ],
    }),

    /**
     * Update a collaborator's role
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - Only OWNER can change roles
     *
     * @param {string} collaboratorId - The collaborator record ID
     * @param {string} newRole - New role (CO_MANAGER, STAFF_CHECKIN, STAFF_LOGISTICS)
     */
    updateCollaboratorRole: builder.mutation({
      query: ({ collaboratorId, newRole }) => ({
        document: UPDATE_COLLABORATOR_ROLE,
        variables: { collaboratorId, newRole },
      }),
      transformResponse: (response) => response.updateCollaboratorRole,
      invalidatesTags: ['Collaborator'],
    }),

    /**
     * Owner liga/desliga a visibilidade da agenda da equipa para um STAFF_LOGISTICS.
     * Invalida também Schedule: o que este staff pode listar muda de imediato.
     */
    updateCollaboratorScheduleAccess: builder.mutation({
      query: ({ collaboratorId, canViewTeamSchedule }) => ({
        document: UPDATE_COLLABORATOR_SCHEDULE_ACCESS,
        variables: { collaboratorId, canViewTeamSchedule },
      }),
      transformResponse: (response) => response.updateCollaboratorScheduleAccess,
      invalidatesTags: ['Collaborator'],
    }),
  }),
});

// Export hooks for use in components
export const {
  // Queries
  useListMyPendingInvitationsQuery,
  useListMyCollaboratedEventsQuery,
  useGetEventAsCollaboratorQuery,
  useListEventCollaboratorsQuery,
  // Mutations
  useInviteCollaboratorMutation,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useRevokeCollaboratorMutation,
  useUpdateCollaboratorFoldersMutation,
  useUpdateCollaboratorSuppliersMutation,
  useUpdateCollaboratorRoleMutation,
  useUpdateCollaboratorScheduleAccessMutation,
} = collaboratorApi;
