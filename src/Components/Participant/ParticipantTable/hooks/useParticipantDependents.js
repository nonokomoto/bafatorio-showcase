import { useListDependentsQuery } from '../../../../Api/services/dependetsApi';


// Hook to fetch dependents for a specific participant
export const useParticipantDependents = (participantId, isEditing) => {
  // Use the generated hook to fetch dependents
  const {
    data: dependents, // The fetched dependents data
    isLoading, // Loading state of the query
    error // Error state of the query
  } = useListDependentsQuery(
    { participantId }, // Pass the participantId as an argument
    { 
      skip: !isEditing || !participantId, // Skip the query if not editing or participantId is not provided
      staleTime: 5 * 60 * 1000 // Cache data for 5 minutes
    }
  );

  // Return the necessary data and states
  return {
    dependents: dependents?.items || [], // Default to an empty array if no data
    isLoading, // Pass through the loading state
    error // Pass through the error state
  };
};