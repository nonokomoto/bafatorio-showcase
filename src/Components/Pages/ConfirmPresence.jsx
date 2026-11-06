import { lazy, Suspense, useMemo } from 'react';
import 'animate.css';
import { useParticipantData } from '../Participant/ParticipantTable/hooks/useParticipantData';
import { useEventRole } from '../../Hook/useEventRole';
import { countDependentsByParticipant } from '../../Api/services/dependentSelector';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import { Text } from '../UI';

// Use index import for skeletons
import { 
  ConfirmPageDetailsSkeleton, 
  SearchParticipantSkeleton, 
  EventSelectionSkeleton,
} from '../Skeletons';

// Lazy-loaded components
const EventSelection = lazy(() => import('../Participant/EventSelection'));
const ConfirmPageDetails = lazy(() => import('../ConfirmPresence/ConfirmPresenceDetails'));
const SearchParticipant = lazy(() => import('../ConfirmPresence/SearchParticipants'));

// Main component for presence confirmation
const ConfirmPresence = () => {
  const { t } = useTranslation('participant');
  
  // Participant + dependent data from Lambda (collaborator-aware, same as Participants page)
  const {
    selectedEventId,
    participantsByEvent: participants,
    allDependents: dependents,
    isLoading: isParticipantsLoading,
    error: participantsError
  } = useParticipantData();

  // Get event details using useEventRole
  const {
    eventDetails,
    isLoading: isEventLoading,
    error: eventError
  } = useEventRole(selectedEventId);

  // Calculate dependent counts using helper and memo
  const dependentCounts = useMemo(() => {
      return countDependentsByParticipant(dependents);
  }, [dependents]);

  // Combinar estados de loading
  const isLoading = isParticipantsLoading || isEventLoading;
  // Combinar erros
  const error = participantsError || eventError;

  return (
    <div className="animate__animated animate__fadeIn animate__faster">
      {/* Page Header — relative z-10 garante que o dropdown do Select fica acima dos cards */}
      <div className="relative z-10">
        <PageHeader
          title={t('pages.confirmPresence.header.title')}
          action={
            <Suspense fallback={<EventSelectionSkeleton compact />}>
              <EventSelection isConfirmPresence compact />
            </Suspense>
          }
        />
      </div>

      {/* Main content - Always show EventSelection and conditional rendering for confirmation components */}
      <div className="animate__animated animate__fadeIn animate__faster flex flex-col gap-6">
        {/* Replace data loading spinner with skeletons */}
        {selectedEventId && isLoading && (
          <>
            <ConfirmPageDetailsSkeleton />
            <SearchParticipantSkeleton />
          </>
        )}

        {selectedEventId && error && (
           <div className="p-4 text-center text-error-500 dark:text-error-400 bg-error-50 dark:bg-error-900/20 rounded-md">
             <Text>{t('searchParticipants.loading.error')}</Text>
             <Text variant="small">{error.message || t('searchParticipants.loading.tryAgain')}</Text>
          </div>
        )}

        {selectedEventId && !isLoading && !error && eventDetails && participants && (
          <>
            <Suspense fallback={<ConfirmPageDetailsSkeleton />}>
              <ConfirmPageDetails 
                events={eventDetails} 
                participants={participants}
                dependents={dependents}
              />
            </Suspense>
            
            <Suspense fallback={<SearchParticipantSkeleton />}>
              <SearchParticipant
                key={selectedEventId}
                eventId={selectedEventId}
                participants={participants}
                dependentCounts={dependentCounts}
                dependents={dependents}
              />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmPresence;
