import { renderHook, act } from '@testing-library/react';
import { useParticipantData } from '../useParticipantData';
import { useDispatch, useSelector } from 'react-redux';
import { useListParticipantsByEventLambdaQuery, participantApi } from '../../../../../Api/services/participantApi';

// Mock dos hooks do Redux
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

// Mock das queries
jest.mock('../../../../../Api/services/participantApi', () => ({
  useListParticipantsByEventLambdaQuery: jest.fn(),
  participantApi: {
    util: {
      invalidateTags: jest.fn()
    },
    endpoints: {
      listParticipantsByEventLambda: {
        initiate: jest.fn()
      }
    }
  }
}));

describe('useParticipantData', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(mockDispatch);
    useSelector.mockReturnValue('event-123');
  });

  it('should return empty participants when no event is selected', () => {
    useSelector.mockReturnValue(null);

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.participantsByEvent).toEqual([]);
    expect(result.current.participantsByEventCount).toBe(0);
  });

  it('should return loading state when fetching participants', () => {
    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.participantsByEvent).toEqual([]);
  });

  it('should return participants from query data', () => {
    const mockParticipants = {
      items: [
        { id: 'p1', participantName: 'John', dependentsCount: 2 },
        { id: 'p2', participantName: 'Jane', dependentsCount: 1 }
      ]
    };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: mockParticipants,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.participantsByEvent).toEqual(mockParticipants.items);
    expect(result.current.participantsByEventCount).toBe(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('should calculate totalDependents correctly from dependentsCount', () => {
    const mockParticipants = {
      items: [
        { id: 'p1', participantName: 'John', dependentsCount: 3 },
        { id: 'p2', participantName: 'Jane', dependentsCount: 2 },
        { id: 'p3', participantName: 'Bob', dependentsCount: 0 }
      ]
    };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: mockParticipants,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.totalDependents).toBe(5);
  });

  it('should handle participants with dependents (flat array from Lambda)', () => {
    const mockParticipants = {
      items: [
        {
          id: 'p1',
          participantName: 'John',
          dependentsCount: 2,
          dependents: [
            { id: 'd1', name: 'Child 1', status: 'REGISTERED', age: 'child' },
            { id: 'd2', name: 'Child 2', status: 'ATTENDED', age: 'baby' }
          ]
        }
      ]
    };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: mockParticipants,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.allDependents).toHaveLength(2);
    expect(result.current.allDependents[0].status).toBe('REGISTERED');
    expect(result.current.allDependents[1].status).toBe('ATTENDED');
  });

  it('should organize dependents by participant', () => {
    const mockParticipants = {
      items: [
        {
          id: 'p1',
          participantName: 'John',
          dependentsCount: 2,
          dependents: [
            { id: 'd1', name: 'Child 1', status: 'REGISTERED' },
            { id: 'd2', name: 'Child 2', status: 'ATTENDED' }
          ]
        },
        {
          id: 'p2',
          participantName: 'Jane',
          dependentsCount: 1,
          dependents: [
            { id: 'd3', name: 'Child 3', status: 'NOT_ATTENDED' }
          ]
        }
      ]
    };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: mockParticipants,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.dependentsByParticipant['p1']).toHaveLength(2);
    expect(result.current.dependentsByParticipant['p2']).toHaveLength(1);
    expect(result.current.dependentsByParticipant['p2'][0].status).toBe('NOT_ATTENDED');
  });

  it('should handle error state', () => {
    const mockError = { message: 'Failed to fetch participants' };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.error).toEqual(mockError);
    expect(result.current.participantsByEvent).toEqual([]);
  });

  it('should call refetch correctly', async () => {
    const mockInvalidateTags = jest.fn();
    participantApi.util.invalidateTags = mockInvalidateTags;

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockInvalidateTags).toHaveBeenCalledWith([
      { type: 'Participant', id: 'LIST_event-123' }
    ]);
  });

  it('should return selectedEventId from selector', () => {
    useSelector.mockReturnValue('my-event-id');

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    expect(result.current.selectedEventId).toBe('my-event-id');
  });

  it('should skip query when no event is selected', () => {
    useSelector.mockReturnValue(null);

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    renderHook(() => useParticipantData());

    expect(useListParticipantsByEventLambdaQuery).toHaveBeenCalledWith(
      { eventId: null },
      expect.objectContaining({ skip: true })
    );
  });

  it('should not skip query when event is selected', () => {
    useSelector.mockReturnValue('event-123');

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    renderHook(() => useParticipantData());

    expect(useListParticipantsByEventLambdaQuery).toHaveBeenCalledWith(
      { eventId: 'event-123' },
      expect.objectContaining({ skip: false })
    );
  });

  it('should handle dependents with new status enum values', () => {
    const mockParticipants = {
      items: [
        {
          id: 'p1',
          participantName: 'John',
          dependentsCount: 3,
          dependents: [
            { id: 'd1', name: 'Child 1', status: 'REGISTERED', age: 'child' },
            { id: 'd2', name: 'Child 2', status: 'ATTENDED', age: 'baby', attendedDate: '2025-12-01T10:00:00Z' },
            { id: 'd3', name: 'Child 3', status: 'NOT_ATTENDED', age: 'adult' }
          ]
        }
      ]
    };

    useListParticipantsByEventLambdaQuery.mockReturnValue({
      data: mockParticipants,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    const { result } = renderHook(() => useParticipantData());

    const dependents = result.current.allDependents;
    expect(dependents).toHaveLength(3);

    const registeredDep = dependents.find(d => d.status === 'REGISTERED');
    const attendedDep = dependents.find(d => d.status === 'ATTENDED');
    const notAttendedDep = dependents.find(d => d.status === 'NOT_ATTENDED');

    expect(registeredDep).toBeDefined();
    expect(attendedDep).toBeDefined();
    expect(attendedDep.attendedDate).toBe('2025-12-01T10:00:00Z');
    expect(notAttendedDep).toBeDefined();
  });
});
