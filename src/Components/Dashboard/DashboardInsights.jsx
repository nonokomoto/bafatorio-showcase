import { useMemo, memo, useState } from 'react';
import { FaEuroSign } from 'react-icons/fa';
import { FiTrendingUp, FiPieChart, FiUsers, FiCalendar, FiRepeat, FiAlertCircle, FiMapPin, FiChevronLeft, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import i18next from 'i18next';
import { Text } from '../UI';
import { createPortal } from 'react-dom'; // Importar createPortal
import { getEventPrimaryDate, getEventPrimaryTimestamp } from '../../Utils/eventDateConversion';

// Enhanced insight card with detailed data on click
const InsightCard = memo(({ insight }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useTranslation('dashboard');
  
  return (
    <div
      className={`p-4 rounded-md transition-colors duration-300 group relative overflow-hidden
        ${insight.justification
          ? 'bg-card hover:bg-accent hover:bg-opacity-5 cursor-pointer'
          : 'bg-card'}
      `}
      onClick={() => insight.justification && setShowDetails(true)}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-2">
          <span className="text-xl group-hover:text-primary-500 transition-colors duration-300 mr-3">{insight.icon}</span>
          <Text variant="subtitle2" weight="medium" className="text-foreground">
            {insight.text}
          </Text>
        </div>

        <Text variant="body2" className="text-muted-foreground ml-8 mb-4">
          {insight.description}
        </Text>
        
        {insight.justification && (
          <div className="mt-auto ml-8 flex items-center text-primary-500 dark:text-primary-400">
            <Text variant="caption" weight="medium" className="opacity-80 group-hover:opacity-100 transition-opacity duration-300">
              {t('insights.justification.viewDetails')}
            </Text>
            <FiArrowRight size={12} className="ml-1 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        )}
      </div>
      
      {/* Modal Portal - renderizado no body do documento com z-index altíssimo */}
      {insight.justification && showDetails && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 100000,
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            isolation: 'isolate',
            pointerEvents: 'auto',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(false);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden animate-fadeIn"
            style={{
              position: 'relative',
              isolation: 'isolate',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              transform: 'scale(1)',
              transition: 'transform 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <span className="text-xl text-primary-500 dark:text-primary-400">{insight.icon}</span>
                <Text variant="subtitle1" weight="medium" className="text-foreground">
                  {insight.text}
                </Text>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(false);
                }}
                className="p-1 rounded-full hover:bg-accent hover:bg-opacity-10 transition-colors duration-200"
              >
                <FiChevronLeft size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              <div className="space-y-5">
                <div>
                  <Text variant="subtitle2" weight="medium" className="text-foreground mb-2">
                    {t('insights.justification.title')}
                  </Text>
                  <Text variant="body2" className="text-muted-foreground">
                    {insight.justification.explanation}
                  </Text>
                </div>

                {insight.justification.breakdown && (
                  <div>
                    <Text variant="subtitle2" weight="medium" className="text-foreground mb-2">
                      {t('insights.justification.breakdown')}
                    </Text>
                    <div className="bg-muted rounded-md p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(insight.justification.breakdown).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <Text variant="caption" className="text-muted-foreground">
                              {key}:
                            </Text>
                            <Text variant="caption" weight="medium" className="text-foreground">
                              {value}
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

// Add display name
InsightCard.displayName = 'InsightCard';

InsightCard.propTypes = {
  insight: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    text: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    justification: PropTypes.shape({
      explanation: PropTypes.string,
      breakdown: PropTypes.object
    })
  }).isRequired
};

// Utility function for calculating percentages
const calculatePercentage = (value, total) => {
  if (!total || total === 0) return '0.00';
  return ((value / total) * 100).toFixed(2);
};

// Utility function for counting occurrences
const getCountMap = (array, key) => {
  return array.reduce((acc, item) => {
    const value = key ? item[key] : item;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
};

// Custom hook for event growth calculations
const useEventGrowth = (events) => {
  return useMemo(() => {
    if (!events || !Array.isArray(events) || !events.length) return '0.00';
    
    // Filter events with valid dates
    const eventsWithValidDates = events.filter(event => getEventPrimaryDate(event));
    
    if (eventsWithValidDates.length < 2) return '0.00';
    
    const sortedEvents = [...eventsWithValidDates].sort((a, b) => getEventPrimaryTimestamp(a) - getEventPrimaryTimestamp(b));
    const firstEventDate = getEventPrimaryDate(sortedEvents[0]);
    const lastEventDate = getEventPrimaryDate(sortedEvents[sortedEvents.length - 1]);
    const monthsDiff = (lastEventDate.getFullYear() - firstEventDate.getFullYear()) * 12 + 
                      (lastEventDate.getMonth() - firstEventDate.getMonth());
    
    // Avoid division by zero
    return monthsDiff > 0 ? ((events.length - 1) / monthsDiff * 100).toFixed(2) : '0.00';
  }, [events]);
};

// Custom hook for event statistics
const useEventStats = (events, translationFunction) => {
  return useMemo(() => {
    const defaultStats = {
      mostPopularType: ['', 0],
      typePercentage: '0.00',
      averageBudget: '0.00',
      maxBudget: { value: 0, eventName: '' },
      minBudget: { value: Number.MAX_SAFE_INTEGER, eventName: '' },
      mostFrequentDay: ['', 0],
      dayPercentage: '0.00',
      mostFrequentLocation: ['', 0],
      locationPercentage: '0.00',
      mostFrequentCategory: ['', 0],
      categoryPercentage: '0.00',
      totalBudget: 0
    };
    
    if (!events || !Array.isArray(events) || !events.length) return defaultStats;

    // Event type statistics
    const typeCounts = getCountMap(events.filter(e => e && e.eventType), 'eventType');
    const mostPopularType = Object.entries(typeCounts).length ? 
      Object.entries(typeCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]) : 
      ['', 0];
    const typePercentage = calculatePercentage(mostPopularType[1], events.length);

    // Budget calculations
    const eventsWithBudget = events.filter(event => event && typeof event.budget === 'number' && !isNaN(event.budget));
    const totalBudget = eventsWithBudget.reduce((sum, event) => sum + (event.budget || 0), 0);
    const averageBudget = eventsWithBudget.length > 0 ? 
      (totalBudget / eventsWithBudget.length).toFixed(2) : 
      '0.00';
    
    // Find max and min budget events
    let maxBudget = { value: 0, eventName: '' };
    let minBudget = { value: Number.MAX_SAFE_INTEGER, eventName: '' };
    
    eventsWithBudget.forEach(event => {
      if (event.budget > maxBudget.value) {
        maxBudget = { value: event.budget, eventName: event.eventTitle || translationFunction('insights.events.unnamed') };
      }
      if (event.budget < minBudget.value && event.budget > 0) {
        minBudget = { value: event.budget, eventName: event.eventTitle || translationFunction('insights.events.unnamed') };
      }
    });
    
    // If no valid minimum budget event was found
    if (minBudget.value === Number.MAX_SAFE_INTEGER) {
      minBudget = { value: 0, eventName: 'N/A' };
    }

    // Day frequency calculations
    const daysCounts = events.reduce((acc, event) => {
      const date = getEventPrimaryDate(event);
      if (!date) return acc;
      
      try {
        // Usar i18n para determinar o local correto em vez de forçar 'pt-PT'
        const currentLanguage = i18next.language;
        const day = date.toLocaleDateString(currentLanguage, { weekday: 'long' });
        acc[day] = (acc[day] || 0) + 1;
      } catch (error) {
        console.error('Error calculating event day:', error);
      }
      
      return acc;
    }, {});
    
    const mostFrequentDay = Object.keys(daysCounts).length ?
      Object.entries(daysCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]) :
      ['', 0];
    const dayPercentage = calculatePercentage(mostFrequentDay[1], events.length);

    // Location statistics
    const locationCounts = events.reduce((acc, event) => {
      if (!event) return acc;
      const location = event.eventLocation || translationFunction('insights.locations.unspecified');
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    
    const mostFrequentLocation = Object.keys(locationCounts).length ?
      Object.entries(locationCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]) :
      ['', 0];
    const locationPercentage = calculatePercentage(mostFrequentLocation[1], events.length);

    // Category statistics
    const categoryCounts = events.reduce((acc, event) => {
      if (!event) return acc;
      const category = event.categories && Array.isArray(event.categories) && event.categories.length > 0 
        ? event.categories[0] 
        : translationFunction('insights.categories.uncategorized');
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const mostFrequentCategory = Object.keys(categoryCounts).length ?
      Object.entries(categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]) :
      ['', 0];
    const categoryPercentage = calculatePercentage(mostFrequentCategory[1], events.length);

    return {
      mostPopularType,
      typePercentage,
      averageBudget,
      maxBudget,
      minBudget,
      mostFrequentDay,
      dayPercentage,
      mostFrequentLocation,
      locationPercentage,
      mostFrequentCategory,
      categoryPercentage,
      totalBudget
    };
  }, [events, translationFunction]);
};

// Custom hook for participant statistics
const useParticipantStats = (participants, events, translationFunction) => {
  return useMemo(() => {
    const defaultStats = {
      attendanceRate: '0.00',
      recurringRate: '0.00',
      cancellationRate: '0.00',
      bestCategory: ['', { total: 0, attended: 0 }]
    };
    
    if (!participants || !Array.isArray(participants) || !participants.length || 
        !events || !Array.isArray(events) || !events.length) {
      return defaultStats;
    }

    // Attendance statistics
    const validParticipants = participants.filter(p => p && typeof p === 'object');
    if (!validParticipants.length) return defaultStats;
    
    const attended = validParticipants.filter(p => p.participantStatus === "ATTENDED").length;
    const attendanceRate = calculatePercentage(attended, validParticipants.length);

    // Recurring participants
    const participantCounts = getCountMap(
      validParticipants.filter(p => p.participantName), 
      'participantName'
    );
    const recurring = Object.values(participantCounts).filter(count => count > 1).length;
    const recurringRate = calculatePercentage(recurring, validParticipants.length);

    // Cancellation rate
    const cancelled = validParticipants.filter(p => p.participantStatus === "CANCELLED").length;
    const cancellationRate = calculatePercentage(cancelled, validParticipants.length);

    // Category attendance — build lookup map first (O(n) instead of O(n*m))
    const participantsByEvent = {};
    validParticipants.forEach(p => {
      if (!p.eventId) return;
      if (!participantsByEvent[p.eventId]) participantsByEvent[p.eventId] = [];
      participantsByEvent[p.eventId].push(p);
    });

    const categoryAttendance = events.reduce((acc, event) => {
      if (!event || !event.id) return acc;

      const category = event.categories && Array.isArray(event.categories) && event.categories.length > 0
        ? event.categories[0]
        : translationFunction('insights.categories.uncategorized');

      if (!acc[category]) {
        acc[category] = { total: 0, attended: 0 };
      }

      const eventParticipants = participantsByEvent[event.id] || [];
      acc[category].total += eventParticipants.length;
      acc[category].attended += eventParticipants.filter(p => p.participantStatus === "ATTENDED").length;
      return acc;
    }, {});

    const bestCategory = Object.keys(categoryAttendance).length > 0 ? 
      Object.entries(categoryAttendance).reduce((a, b) => {
        const rateA = a[1].total > 0 ? a[1].attended / a[1].total : 0;
        const rateB = b[1].total > 0 ? b[1].attended / b[1].total : 0;
        return rateA > rateB ? a : b;
      }, ['', { total: 0, attended: 0 }]) :
      ['', { total: 0, attended: 0 }];

    return {
      attendanceRate,
      recurringRate,
      cancellationRate,
      bestCategory
    };
  }, [participants, events, translationFunction]);
};

const KeyInsights = ({ events = [], participants = [] }) => {
  const { t } = useTranslation('dashboard');
  
  // Call hooks before early return to avoid conditional hook errors
  const growthRate = useEventGrowth(events);
  const eventStats = useEventStats(events, t);
  const participantStats = useParticipantStats(participants, events, t);
  
  // Pre-compute grouped data in a single pass (O(n) instead of multiple O(n) passes)
  const eventGroups = useMemo(() => {
    const byDay = {};
    const byCategory = {};
    const byLocation = {};
    const byType = {};
    const currentLanguage = i18next.language;
    const currentMonth = new Date().getMonth();
    const lastMonth = (currentMonth - 1 + 12) % 12;
    let thisMonthCount = 0;
    let lastMonthCount = 0;

    events.forEach(event => {
      const date = getEventPrimaryDate(event);
      if (date) {
        try {
          const day = date.toLocaleDateString(currentLanguage, { weekday: 'long' });
          byDay[day] = (byDay[day] || 0) + 1;
          const month = date.getMonth();
          if (month === currentMonth) thisMonthCount++;
          if (month === lastMonth) lastMonthCount++;
        } catch { /* skip invalid */ }
      }
      const category = event?.categories?.[0] || t('insights.categories.uncategorized');
      byCategory[category] = (byCategory[category] || 0) + 1;
      const location = event?.eventLocation || t('insights.locations.unspecified');
      byLocation[location] = (byLocation[location] || 0) + 1;
      const type = event?.eventType || t('insights.types.unspecified');
      byType[type] = (byType[type] || 0) + 1;
    });

    return { byDay, byCategory, byLocation, byType, thisMonthCount, lastMonthCount };
  }, [events, t]);

  const participantGroups = useMemo(() => {
    const nameCounts = {};
    let attendedCount = 0;
    let cancelledCount = 0;

    participants.forEach(p => {
      if (p?.participantStatus === 'ATTENDED') attendedCount++;
      if (p?.participantStatus === 'CANCELLED') cancelledCount++;
      if (p?.participantName) nameCounts[p.participantName] = (nameCounts[p.participantName] || 0) + 1;
    });

    const recurringCount = Object.values(nameCounts).filter(c => c > 1).reduce((sum, c) => sum + c, 0);
    const uniqueRecurringCount = Object.values(nameCounts).filter(c => c > 1).length;

    return { attendedCount, cancelledCount, recurringCount, uniqueRecurringCount };
  }, [participants]);

  // Calculate insights before early return
  const insights = useMemo(() => {

    return [
      {
        icon: <FiTrendingUp className="text-primary" />,
        text: `${growthRate}% ${t('insights.monthlyGrowth.text')}`,
        description: t('insights.monthlyGrowth.description'),
        justification: {
          explanation: t('insights.justification.growthExplanation', {
            rate: growthRate,
            currentMonth: new Date().toLocaleDateString(i18next.language, { month: 'long' }),
            eventsThisMonth: eventGroups.thisMonthCount,
            totalEvents: events.length
          }),
          breakdown: {
            [t('insights.justification.totalEvents')]: events.length,
            [t('insights.justification.eventsThisMonth')]: eventGroups.thisMonthCount,
            [t('insights.justification.eventsLastMonth')]: eventGroups.lastMonthCount,
            [t('insights.justification.growthRate')]: growthRate + '%'
          }
        }
      },
      {
        icon: <FaEuroSign className="text-success" />,
        text: `${eventStats.averageBudget}€ ${t('insights.averageBudget.text')}`,
        description: t('insights.averageBudget.description'),
        justification: {
          explanation: t('insights.justification.budgetExplanation', {
            average: eventStats.averageBudget,
            totalBudget: eventStats.totalBudget.toFixed(2),
            eventsWithBudget: events.filter(e => e?.budget !== undefined && e?.budget !== null).length
          }),
          breakdown: {
            [t('insights.justification.averageBudget')]: eventStats.averageBudget + '€',
            [t('insights.justification.maxBudget')]: eventStats.maxBudget.value + '€',
            [t('insights.justification.minBudget')]: eventStats.minBudget.value + '€',
            [t('insights.justification.eventsWithBudget')]: events.filter(e => e?.budget !== undefined && e?.budget !== null).length
          }
        }
      },
      {
        icon: <FiCalendar className="text-primary" />,
        text: `${eventStats.mostFrequentDay[0]}: ${eventStats.dayPercentage}% ${t('insights.mostFrequentDay.text')}`,
        description: t('insights.mostFrequentDay.description'),
        justification: {
          explanation: t('insights.justification.dayExplanation', {
            day: eventStats.mostFrequentDay[0],
            percentage: eventStats.dayPercentage
          }),
          breakdown: eventGroups.byDay
        }
      },
      {
        icon: <FiUsers className="text-secondary" />,
        text: `${participantStats.attendanceRate}% ${t('insights.attendanceRate.text')}`,
        description: t('insights.attendanceRate.description'),
        justification: {
          explanation: t('insights.justification.attendanceExplanation', {
            rate: participantStats.attendanceRate,
            attendedParticipants: participantGroups.attendedCount,
            totalParticipants: participants.length
          }),
          breakdown: {
            [t('insights.justification.totalParticipants')]: participants.length,
            [t('insights.justification.attendedParticipants')]: participantGroups.attendedCount,
            [t('insights.justification.attendanceRate')]: participantStats.attendanceRate + '%'
          }
        }
      },
      {
        icon: <FiPieChart className="text-primary-dark" />,
        text: `${t('insights.mostFrequentCategory.text')} ${eventStats.mostFrequentCategory[0]}`,
        description: `${eventStats.categoryPercentage}% ${t('insights.mostFrequentCategory.description')}`,
        justification: {
          explanation: t('insights.justification.categoryExplanation', {
            category: eventStats.mostFrequentCategory[0],
            percentage: eventStats.categoryPercentage,
            count: eventStats.mostFrequentCategory[1],
            total: events.length
          }),
          breakdown: eventGroups.byCategory
        }
      },
      {
        icon: <FiMapPin className="text-warning" />,
        text: `${eventStats.mostFrequentLocation[0]}: ${eventStats.locationPercentage}% ${t('insights.mostFrequentLocation.text')}`,
        description: t('insights.mostFrequentLocation.description'),
        justification: {
          explanation: t('insights.justification.locationExplanation', {
            location: eventStats.mostFrequentLocation[0],
            percentage: eventStats.locationPercentage,
            count: eventStats.mostFrequentLocation[1],
            total: events.length
          }),
          breakdown: eventGroups.byLocation
        }
      },
      {
        icon: <FiPieChart className="text-secondary" />,
        text: `${eventStats.mostPopularType[0] === 'public' ? t('insights.eventType.publicText') : t('insights.eventType.privateText')}: ${eventStats.typePercentage}%`,
        description: t('insights.eventType.description'),
        justification: {
          explanation: t('insights.justification.typeExplanation', {
            type: eventStats.mostPopularType[0] === 'public' ? t('insights.eventType.publicText') : t('insights.eventType.privateText'),
            percentage: eventStats.typePercentage,
            count: eventStats.mostPopularType[1],
            total: events.length
          }),
          breakdown: eventGroups.byType
        }
      },
      {
        icon: <FiRepeat className="text-primary" />,
        text: `${participantStats.recurringRate}% ${t('insights.recurringRate.text')}`,
        description: t('insights.recurringRate.description'),
        justification: {
          explanation: t('insights.justification.recurringExplanation', {
            rate: participantStats.recurringRate,
            recurringParticipants: participantGroups.recurringCount,
            uniqueRecurringParticipants: participantGroups.uniqueRecurringCount,
            totalParticipants: participants.length
          }),
          breakdown: {
            [t('insights.justification.totalParticipants')]: participants.length,
            [t('insights.justification.recurringParticipants')]: participantGroups.recurringCount,
            [t('insights.justification.uniqueRecurringParticipants')]: participantGroups.uniqueRecurringCount,
            [t('insights.justification.recurringRate')]: participantStats.recurringRate + '%'
          }
        }
      },
      {
        icon: <FiAlertCircle className="text-warning" />,
        text: `${t('insights.cancellationRate.text')} ${participantStats.cancellationRate}%`,
        description: t('insights.cancellationRate.description'),
        justification: {
          explanation: t('insights.justification.cancellationExplanation', {
            rate: participantStats.cancellationRate,
            cancelledParticipants: participantGroups.cancelledCount,
            totalParticipants: participants.length
          }),
          breakdown: {
            [t('insights.justification.totalParticipants')]: participants.length,
            [t('insights.justification.cancelledParticipants')]: participantGroups.cancelledCount,
            [t('insights.justification.cancellationRate')]: participantStats.cancellationRate + '%'
          }
        }
      }
    ];
  }, [growthRate, eventStats, participantStats, eventGroups, participantGroups, t, events, participants]);

  // Early return for empty data
  if (events.length === 0 || participants.length === 0) {
    return (
      <div className="bg-card shadow-card rounded-lg p-6 my-8 animate-fade-in">
        <div className="p-4 rounded-md bg-card">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="text-warning text-xl" />
            <Text variant="h5" weight="medium" className="text-foreground">
              {t('insights.noData.title')}
            </Text>
          </div>
          <Text variant="body2" className="text-muted-foreground ml-8">
            {t('insights.noData.description')}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-card rounded-lg p-6 my-8 animate-fade-in">
      <Text variant="h5" weight="semibold" className="text-foreground mb-6">
        {t('insights.title')}
      </Text>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>
    </div>
  );
};

KeyInsights.propTypes = {
  events: PropTypes.array,
  participants: PropTypes.array
};

KeyInsights.displayName = 'KeyInsights';

export default memo(KeyInsights);
