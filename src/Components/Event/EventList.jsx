import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import EventCard from './EventCard';
import Pagination from './Pagination';
import EventControls from './EventControls';
import NoDataImage from '../../assets/NoData.svg';
import 'animate.css';
import { getEventPrimaryTimestamp } from '../../Utils/eventDateConversion';

// Empty state component (extracted to avoid re-creation on every render)
const NoEventsMessage = ({ isFiltered, t }) => (
  <div className="flex flex-col items-center justify-center py-20 animate__animated animate__fadeIn">
    <img
      src={NoDataImage}
      alt={t('noEvents.altText')}
      className="w-28 mb-6"
    />
    <h2 className="font-display text-xl font-medium text-foreground mb-2">
      {isFiltered
        ? t('noEvents.messageFiltered')
        : t('noEvents.title')}
    </h2>
    <p className="font-sans text-base text-muted-foreground text-center">
      {isFiltered
        ? t('noEvents.messageSearch')
        : t('noEvents.messageCreate')}
    </p>

  </div>
);

NoEventsMessage.propTypes = {
  isFiltered: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

const EventList = ({events}) => {
  const { filter, sortCriterion, searchQuery, currentPage, itemsPerPage } = useSelector(state => state.eventControls);
  const { t } = useTranslation('event');

  // Verifica se há eventos no total (antes de filtros)
  const hasEvents = events && events.length > 0;

  // Memoized filtered and sorted events
  const filteredAndSortedEvents = useMemo(() => {
    if (!events) return [];

    // Define status priorities for default sorting
    const statusPriority = (status) => {
      if (status === 'CANCELLED') return 2; // Lowest priority (show last)
      if (status === 'COMPLETED') return 1; // Intermediate priority
      // SCHEDULED, ONGOING, UNKNOWN etc. get priority 0 (show first)
      return 0;
    };

    return events
      .filter(event => {
        const matchesFilter = filter === 'all' || event.eventStatus === filter;
        // eventTitle pode vir null (dados legados/seeds) — um registo mau não
        // pode derrubar a lista inteira.
        const matchesSearch = (event.eventTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        // Apply user-selected sort criterion if available
        switch (sortCriterion) {
          case 'dateAsc':
            return getEventPrimaryTimestamp(a) - getEventPrimaryTimestamp(b);
          case 'dateDesc':
            return getEventPrimaryTimestamp(b) - getEventPrimaryTimestamp(a);
          case 'titleAsc':
            return (a.eventTitle || '').localeCompare(b.eventTitle || '');
          case 'titleDesc':
            return (b.eventTitle || '').localeCompare(a.eventTitle || '');
          default: {
            // Default sorting logic (when no sortCriterion is selected)
            const priorityA = statusPriority(a.eventStatus);
            const priorityB = statusPriority(b.eventStatus);

            // 1. Sort by status priority
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }

            // 2. If priorities are the same, sort by creation date descending (newest created first)
            // Assuming eventCreationDate exists on the event object
            return new Date(b.eventCreationDate) - new Date(a.eventCreationDate);
          }
        }
      });
  }, [events, filter, sortCriterion, searchQuery]);

  const currentEvents = useMemo(() => {
    const indexOfLastEvent = currentPage * itemsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
    return filteredAndSortedEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  }, [currentPage, itemsPerPage, filteredAndSortedEvents]);

  return (
    <div className="space-y-8">
      {/* Controls Section - Só mostra se houver eventos */}
      {hasEvents && (
        <EventControls totalEvents={filteredAndSortedEvents.length} />
      )}

      {/* Grid System */}
      {!hasEvents ? (
        <NoEventsMessage isFiltered={false} t={t} />
      ) : filteredAndSortedEvents.length === 0 ? (
        <NoEventsMessage isFiltered={true} t={t} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              totalRegistrations={event.totalRegistrations ?? event.participantCount ?? 0}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredAndSortedEvents.length > 0 && (
        <div className="mt-8">
          <Pagination totalItems={filteredAndSortedEvents.length} />
        </div>
      )}
    </div>
  );
};

EventList.propTypes = {
  events: PropTypes.array,
};

export default EventList;
