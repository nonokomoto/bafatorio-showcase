import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FaCalendar, FaUser, FaMapMarkerAlt } from 'react-icons/fa';
import { FiClipboard } from 'react-icons/fi';
import { formatEventDateDisplay, formatEventTime } from '../../Utils/formatDate';
import 'animate.css';
import EventDelete from './EventDelete';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Text } from '../UI';
import { EVENT_ROLES } from '../../Utils/eventRolesConfig';
import { resolveEventStatus } from '../../Utils/eventStatusConfig';

const EventCard = ({
  event,
  index = 0,
  totalRegistrations = 0
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('event');


  const isStaffCheckin = event.userRole === EVENT_ROLES.STAFF_CHECKIN;
  const handleNavigate = () => {
    if (!isStaffCheckin) navigate(`/app/event/${event.id}`);
  };
  // Enter/Space no alvo focável ("Ver Detalhes") navega — paridade teclado/rato.
  const handleKeyNavigate = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  };

  // Choose how status reads on the card: 'solidHeader' | 'softBadge' | 'solidBadge'
  const STATUS_STYLE = 'softBadge';
  const status = resolveEventStatus(event.eventStatus, STATUS_STYLE);
  const dateDisplay = formatEventDateDisplay(event);
  const timeDisplay = formatEventTime(event.eventTime);

  // Cores para ícones - mantidas simples para todos os estados
  const iconColor = 'text-primary-500/60 dark:text-primary-400/60';

  return (
    <Card
      elevated="sm"
      padded={false}
      interactive={!isStaffCheckin}
      className={`animate__animated animate__fadeIn transition-all duration-300 overflow-hidden
        ${!isStaffCheckin ? 'hover:translate-y-[-3px] hover:shadow-md' : ''}`}
      style={{animationDelay: `${index * 50}ms`}}
      onClick={handleNavigate}
    >
      {/* Header com status e badges */}
      <div className={`p-4 ${status.headerBg}`}>
          <div className="flex justify-between items-center">
            <Badge
              variant={status.variant}
              tone={status.tone}
              size="sm"
              className="font-medium"
            >
              {t(status.labelKey)}
            </Badge>
          </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5">
        {/* Título do evento */}
        <Text
          variant="h5"
          className="font-medium mb-4 line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
          onClick={handleNavigate}
        >
          {event.eventTitle}
        </Text>

        {/* Informações do evento */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <FaCalendar className={`${iconColor} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2">
              {dateDisplay
                ? [dateDisplay, timeDisplay].filter(Boolean).join(' · ')
                : t('eventCard.date.missing')}
            </Text>
          </div>

          {event.eventLocation && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <FaMapMarkerAlt className={`${iconColor} w-4 h-4 flex-shrink-0`} />
              <Text variant="body2" className="line-clamp-1">
                {event.eventLocation}
              </Text>
            </div>
          )}

          <div className="flex items-center gap-3 text-muted-foreground">
            <FaUser className={`${iconColor} w-4 h-4 flex-shrink-0`} />
            <Text variant="body2">
              {t('eventCard.totalRegistrations.label')} {totalRegistrations || event.participantCount || 0}
            </Text>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
          {event.userRole === EVENT_ROLES.OWNER && (
            <div onClick={(e) => e.stopPropagation()}>
              <EventDelete eventId={event.id} eventTitle={event.eventTitle} />
            </div>
          )}

          {/* Link para visualizar detalhes (hidden for STAFF_CHECKIN) */}
          {!isStaffCheckin && (
            <div
              role="link"
              tabIndex={0}
              aria-label={t('eventCard.buttons.viewDetails')}
              onClick={handleNavigate}
              onKeyDown={handleKeyNavigate}
              className="flex items-center gap-1.5 rounded text-primary-500/80 dark:text-primary-400/80 text-sm font-medium cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {t('eventCard.buttons.viewDetails')}
              <FiClipboard className="w-3.5 h-3.5 ml-0.5" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// PropTypes para validação
EventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.string.isRequired,
    eventTitle: PropTypes.string.isRequired,
    eventDateType: PropTypes.string,
    eventStartDate: PropTypes.string,
    eventEndDate: PropTypes.string,
    eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
    eventTime: PropTypes.string,
    eventLocation: PropTypes.string,
    eventStatus: PropTypes.string,
    participantCount: PropTypes.number,
    userRole: PropTypes.string
  }).isRequired,
  index: PropTypes.number,
  totalRegistrations: PropTypes.number
};

export default EventCard;
