import { createApi } from '@reduxjs/toolkit/query/react';
import { getClient } from '../amplifyClient.js';
import { eventSupplierApi } from './eventSupplierApi.js';

const amplifyBaseQuery = async ({ document, variables }) => {
  try {
    const response = await getClient().graphql({ query: document, variables });
    return { data: response.data };
  } catch (error) {
    console.error('[scheduleApi] GraphQL Error:', error.message || error);
    return { error: { status: 'GRAPHQL_ERROR', message: error.message, data: error } };
  }
};

const CREATE_SCHEDULE_ENTRY = /* GraphQL */ `
  mutation CreateScheduleEntry(
    $eventId: String!
    $title: String!
    $date: String!
    $startTime: String
    $endTime: String
    $description: String
    $location: String
    $supplierId: String
    $participantIds: [String]
    $color: String
    $order: Int
  ) {
    createScheduleEntry(
      eventId: $eventId
      title: $title
      date: $date
      startTime: $startTime
      endTime: $endTime
      description: $description
      location: $location
      supplierId: $supplierId
      participantIds: $participantIds
      color: $color
      order: $order
    ) {
      id
      eventId
      date
      startTime
      endTime
      title
      description
      location
      supplierId
      participantIds
      color
      order
      owner
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SCHEDULE_ENTRY = /* GraphQL */ `
  mutation UpdateScheduleEntry(
    $id: String!
    $eventId: String!
    $title: String
    $date: String
    $startTime: String
    $endTime: String
    $description: String
    $location: String
    $supplierId: String
    $participantIds: [String]
    $color: String
    $order: Int
  ) {
    updateScheduleEntry(
      id: $id
      eventId: $eventId
      title: $title
      date: $date
      startTime: $startTime
      endTime: $endTime
      description: $description
      location: $location
      supplierId: $supplierId
      participantIds: $participantIds
      color: $color
      order: $order
    ) {
      id
      eventId
      date
      startTime
      endTime
      title
      description
      location
      supplierId
      participantIds
      color
      order
      owner
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SCHEDULE_ENTRY = /* GraphQL */ `
  mutation DeleteScheduleEntry($id: String!, $eventId: String!) {
    deleteScheduleEntry(id: $id, eventId: $eventId) {
      id
    }
  }
`;

const LIST_EVENT_SCHEDULE = /* GraphQL */ `
  query ListEventSchedule($eventId: String!) {
    listEventSchedule(eventId: $eventId) {
      items {
        id
        eventId
        date
        startTime
        endTime
        title
        description
        location
        supplierId
        participantIds
        color
        order
        owner
        createdAt
        updatedAt
      }
      authors {
        userId
        name
      }
    }
  }
`;

export const scheduleApi = createApi({
  reducerPath: 'scheduleApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['ScheduleEntry'],
  endpoints: (builder) => ({
    createScheduleEntry: builder.mutation({
      query: ({ eventId, title, date, startTime, endTime, description, location, supplierId, participantIds, color, order }) => ({
        document: CREATE_SCHEDULE_ENTRY,
        variables: { eventId, title, date, startTime, endTime, description, location, supplierId, participantIds, color, order },
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'ScheduleEntry', id: `LIST_${eventId}` },
      ],
      async onQueryStarted({ supplierId }, { dispatch, queryFulfilled }) {
        if (!supplierId) return;
        try {
          await queryFulfilled;
          dispatch(eventSupplierApi.util.invalidateTags([{ type: 'EventSupplier', id: 'LIST' }]));
        } catch { /* mutation failed — no cross-invalidation needed */ }
      },
    }),
    updateScheduleEntry: builder.mutation({
      query: ({ id, eventId, title, date, startTime, endTime, description, location, supplierId, participantIds, color, order }) => ({
        document: UPDATE_SCHEDULE_ENTRY,
        variables: { id, eventId, title, date, startTime, endTime, description, location, supplierId, participantIds, color, order },
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'ScheduleEntry', id: `LIST_${eventId}` },
      ],
      async onQueryStarted({ supplierId }, { dispatch, queryFulfilled }) {
        if (!supplierId) return;
        try {
          await queryFulfilled;
          dispatch(eventSupplierApi.util.invalidateTags([{ type: 'EventSupplier', id: 'LIST' }]));
        } catch { /* mutation failed — no cross-invalidation needed */ }
      },
    }),
    deleteScheduleEntry: builder.mutation({
      query: ({ id, eventId }) => ({
        document: DELETE_SCHEDULE_ENTRY,
        variables: { id, eventId },
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'ScheduleEntry', id: `LIST_${eventId}` },
      ],
    }),
    listScheduleEntriesByEvent: builder.query({
      query: ({ eventId }) => ({
        document: LIST_EVENT_SCHEDULE,
        variables: { eventId },
      }),
      transformResponse: (response) => {
        if (!response?.listEventSchedule?.items) return { items: [], authors: [] };
        return {
          items: response.listEventSchedule.items,
          authors: response.listEventSchedule.authors ?? [],
        };
      },
      providesTags: (result, error, { eventId }) => [
        { type: 'ScheduleEntry', id: `LIST_${eventId}` },
        ...(result?.items?.map(entry => ({ type: 'ScheduleEntry', id: entry.id })) || []),
      ],
    }),
  }),
});

export const {
  useCreateScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
  useListScheduleEntriesByEventQuery,
} = scheduleApi;
