import { FiUsers, FiCheckCircle, FiAward, FiTrendingUp } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Text } from '../UI';
import { useMemo } from 'react';
import { formatEventDateDisplay } from '../../Utils/formatDate';
import { useRoleLookup } from '../../Hook/useRoleLookup';

const ConfirmPageDetails = ({ events, participants, dependents = [] }) => {
  const { t } = useTranslation('participant');
  // Participants carry only roleId (the Lambda returns no nested role object), so resolve
  // the role name from the event's roles to detect VIPs.
  const { roleMap, isLoading: rolesLoading } = useRoleLookup();

  // Calculate all metrics
  const metrics = useMemo(() => {
    const totalParticipants = participants.length;
    const totalDependents = dependents.length;
    const totalPeople = totalParticipants + totalDependents;

    // Confirmed participants (status ATTENDED)
    const confirmedParticipants = participants.filter(
      p => p.participantStatus === 'ATTENDED'
    ).length;

    // Confirmed dependents (status ATTENDED)
    const confirmedDependents = dependents.filter(
      d => d.status === 'ATTENDED'
    ).length;

    const totalConfirmed = confirmedParticipants + confirmedDependents;

    // Confirmation rate
    const confirmationRate = totalPeople > 0 
      ? Math.round((totalConfirmed / totalPeople) * 100) 
      : 0;

    // Presenças por role: uma passagem O(n) com hash map, depois ordenar as
    // entradas (no máximo o número de roles do evento) e cortar nas 3 primeiras.
    // Enquanto o roleMap não chega ficam vazias — contar antes rotularia todos
    // os presentes como "Sem role".
    const presentByRole = new Map();
    if (!rolesLoading) {
      participants.forEach(p => {
        if (p.participantStatus !== 'ATTENDED') return;
        const name = roleMap[p.roleId] || t('confirmPageDetails.cards.topRoles.noRole');
        presentByRole.set(name, (presentByRole.get(name) || 0) + 1);
      });
    }

    const topRoles = [...presentByRole.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalPeople,
      totalParticipants,
      totalDependents,
      totalConfirmed,
      confirmedParticipants,
      confirmedDependents,
      confirmationRate,
      topRoles
    };
  }, [participants, dependents, roleMap, rolesLoading, t]);

  const eventDateDisplay = formatEventDateDisplay(events) || t('confirmPageDetails.cards.eventDate.unavailable');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total People */}
      <StatItem
        label={t('confirmPageDetails.cards.totalPeople.title')}
        value={metrics.totalPeople}
        subtitle={t('confirmPageDetails.cards.totalPeople.breakdown', {
          participants: metrics.totalParticipants,
          dependents: metrics.totalDependents
        })}
        icon={FiUsers}
        iconClassName="text-sky-500"
      />

      {/* Present */}
      <StatItem
        label={t('confirmPageDetails.cards.present.title')}
        value={metrics.totalConfirmed}
        subtitle={t('confirmPageDetails.cards.present.breakdown', {
          participants: metrics.confirmedParticipants,
          dependents: metrics.confirmedDependents
        })}
        icon={FiCheckCircle}
        iconClassName="text-emerald-500"
      />

      {/* Presenças por role (top 3) */}
      <StatItem
        label={t('confirmPageDetails.cards.topRoles.title')}
        items={metrics.topRoles}
        emptyText={rolesLoading ? '' : t('confirmPageDetails.cards.topRoles.empty')}
        icon={FiAward}
        iconClassName="text-amber-500"
      />

      {/* Presence Rate */}
      <StatItem
        label={t('confirmPageDetails.cards.presenceRate.title')}
        value={`${metrics.confirmationRate}%`}
        subtitle={eventDateDisplay}
        icon={FiTrendingUp}
        iconClassName="text-primary"
        showProgress
        progressValue={metrics.confirmationRate}
      />
    </div>
  );
};

const StatItem = ({ label, value, subtitle, items, emptyText, iconClassName, showProgress, progressValue, icon: Icon }) => (
  <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <Icon className={iconClassName} size={20} />
    </div>
    {/* Um cartão mostra ou um valor único, ou uma lista de linhas (ex. top roles) */}
    {items ? (
      <>
        <Text variant="body2" className="text-muted-foreground font-medium mb-1">
          {label}
        </Text>
        {items.length === 0 ? (
          emptyText ? <Text variant="small" className="text-muted-foreground">{emptyText}</Text> : null
        ) : (
          <div className="space-y-0.5">
            {items.map(item => (
              <div key={item.name} className="flex items-baseline justify-between gap-2">
                <Text variant="small" className="text-muted-foreground truncate">{item.name}</Text>
                <Text variant="small" className="text-foreground font-semibold flex-shrink-0">{item.count}</Text>
              </div>
            ))}
          </div>
        )}
      </>
    ) : (
      <>
        <Text variant="h5" className="text-foreground font-semibold mb-1">
          {value}
        </Text>
        <Text variant="body2" className="text-muted-foreground font-medium mb-0.5">
          {label}
        </Text>
        {subtitle && (
          <Text variant="small" className="text-muted-foreground">
            {subtitle}
          </Text>
        )}
      </>
    )}
    {showProgress && (
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    )}
  </div>
);

StatItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtitle: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
  })),
  emptyText: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  iconClassName: PropTypes.string,
  showProgress: PropTypes.bool,
  progressValue: PropTypes.number,
};

ConfirmPageDetails.propTypes = {
  events: PropTypes.shape({
    eventDateType: PropTypes.string,
    eventStartDate: PropTypes.string,
    eventEndDate: PropTypes.string,
    eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    participantStatus: PropTypes.string.isRequired,
    roleId: PropTypes.string,
  })).isRequired,
  dependents: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string
  }))
};

export default ConfirmPageDetails;
