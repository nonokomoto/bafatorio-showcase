import { FiCalendar, FiUsers, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';
import 'animate.css';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import Text from '../UI/Text';
import Badge from '../UI/Badge';

const MetricCard = ({ title, value, change, icon: Icon, variant = 'primary', animationDelay }) => {
  const { t } = useTranslation('dashboard');
  
  // Mapear variantes para classes Tailwind
  const variants = {
    primary: {
      iconBackground: 'bg-primary-50 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      valueColor: 'text-primary-600 dark:text-primary-400',
      badgeBackground: 'bg-primary-50/50 dark:bg-primary-900/20',
      headerBg: 'bg-primary-50/50 dark:bg-primary-900/10',
      shadowColor: 'shadow-primary-500/10 dark:shadow-primary-600/5'
    },
    success: {
      iconBackground: 'bg-secondary-50 dark:bg-secondary-900/30',
      iconColor: 'text-secondary-600 dark:text-secondary-400',
      valueColor: 'text-secondary-600 dark:text-secondary-400',
      badgeBackground: 'bg-secondary-50/50 dark:bg-secondary-900/20',
      headerBg: 'bg-secondary-50/50 dark:bg-secondary-900/10',
      shadowColor: 'shadow-secondary-500/10 dark:shadow-secondary-600/5'
    }
  };

  const colors = variants[variant];

  return (
    <div
      className={`rounded-xl bg-card overflow-hidden shadow-sm dark:shadow-dark-card
                 transition-all duration-300 hover:shadow-lg dark:hover:shadow-dark-elevated hover:translate-y-[-3px]
                 animate__animated animate__fadeInUp ${colors.shadowColor}
                 group`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header com background suave */}
      <div className={`px-6 py-4 ${colors.headerBg}`}>
        <div className="flex items-center justify-between">
          <Text
            variant="subtitle2"
            className="font-medium text-muted-foreground group-hover:text-foreground transition-colors"
          >
            {title}
          </Text>
          <div className={`${colors.iconBackground} p-2.5 rounded-full transition-transform group-hover:scale-110`}>
            <Icon className={`${colors.iconColor}`} size={20} />
          </div>
        </div>
      </div>
      
      {/* Conteúdo do card */}
      <div className="px-6 py-5">
        <Text 
          variant="h4" 
          className={`font-semibold ${colors.valueColor} animate__animated animate__fadeIn animate__delay-1s`}
        >
          {value.toLocaleString()}
        </Text>
        
        {change !== undefined && (
          <div className="flex items-center mt-3 animate__animated animate__fadeIn animate__delay-1s">
            <Badge
              variant={change >= 0 ? 'success' : 'error'}
              tone="soft"
              size="sm"
              className="flex items-center text-xs font-medium"
            >
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </Badge>
            <Text
              variant="body2"
              className="ml-2 text-muted-foreground"
            >
              {t('header.relation')}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  change: PropTypes.number,
  icon: PropTypes.elementType.isRequired,
  variant: PropTypes.oneOf(['primary', 'success']),
  animationDelay: PropTypes.number
};

const DashboardHeader = ({ headerMetrics = {} }) => {
  const { t } = useTranslation('dashboard');

  const {
    totalEvents = 0,
    totalParticipants = 0,
    futureEvents = 0,
    doneEvents = 0,
    eventsChange,
    participantsChange,
    doneEventsChange
  } = headerMetrics;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 overflow-hidden">
        <MetricCard
          title={t('header.events')}
          value={totalEvents}
          change={eventsChange}
          icon={FiCalendar}
          variant="primary"
          animationDelay={0}
        />
        <MetricCard
          title={t('header.participants')}
          value={totalParticipants}
          change={participantsChange}
          icon={FiUsers}
          variant="success"
          animationDelay={150}
        />
        <MetricCard
          title={t('header.futureEvents')}
          value={futureEvents}
          icon={FiTrendingUp}
          variant="primary"
          animationDelay={300}
        />
        <MetricCard
          title={t('header.doneEvents')}
          value={doneEvents}
          change={doneEventsChange}
          icon={FiCheckCircle}
          variant="success"
          animationDelay={450}
        />
      </div>
    </div>
  );
};

DashboardHeader.propTypes = {
  headerMetrics: PropTypes.shape({
    totalEvents: PropTypes.number,
    totalParticipants: PropTypes.number,
    futureEvents: PropTypes.number,
    doneEvents: PropTypes.number,
    eventsChange: PropTypes.number,
    participantsChange: PropTypes.number,
    doneEventsChange: PropTypes.number
  })
};

export default DashboardHeader;