import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { FiPieChart, FiBarChart2, FiTrendingUp, FiUsers, FiUserPlus, FiCalendar } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { AnimatedChartContainer } from './AnimatedChartContainer';
import {
  getEventTypeDistributionOption,
  getEventStatusOption,
  getParticipantRoleOption,
  getDependentAgeDistributionOption,
  getAttendanceRateOption,
  getRegistrationGrowthOption,
  getDependentsPerParticipantOption,
  getTopCategoriesOption,
  getBudgetDistributionOption,
  getMonthlyGrowthOption,
  getParticipantStatusOption,
  getDependentConversionRate
} from './utils/chartOptions';
import ChartSkeleton from '../Common/ChartSkeleton';
import { useRoleLookup } from '../../Hook/useRoleLookup';

// Memoized ECharts component for better performance
const MemoizedEChart = React.memo(({ option, onEvents = {} }) => (
  <ReactECharts 
    option={option}
    lazyUpdate={true}
    notMerge={true}
    opts={{ renderer: 'canvas' }}
    style={{ height: '300px', width: '100%' }}
    onEvents={onEvents}
    className="chart-container"
  />
));

MemoizedEChart.displayName = 'MemoizedEChart';
MemoizedEChart.propTypes = {
  option: PropTypes.object.isRequired,
  onEvents: PropTypes.object
};

// Memoized Tab Button component
const TabButton = React.memo(({ label, value, icon: Icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(value)}
    className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-normal ${
      isActive 
        ? 'bg-primary-500 text-white font-display text-sm font-medium shadow-sm'
        : 'bg-muted text-muted-foreground hover:bg-accent hover:bg-opacity-20 font-display text-sm font-medium'
    }`}
  >
    <Icon className="mr-2" />
    {label}
  </button>
));

TabButton.displayName = 'TabButton';
TabButton.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

const DashboardChart = ({ 
  events = [], 
  participants = [], 
  dependents = [],
  showTabs = true,
  specificCharts = [],
  isLoading = false
}) => {
  // Sempre inicializar com 'events' como aba ativa
  const [activeTab, setActiveTab] = useState('events');
  const { t } = useTranslation('dashboard');
  const { roleMap } = useRoleLookup();
  
  // Pre-compute aggregates in a single pass per data source (O(n) instead of O(n^2))
  const eventAggregates = useMemo(() => {
    const typeCounts = {};
    const statusCounts = {};
    const categories = {};
    const categoryBudgets = {};
    const months = {};
    let totalBudget = 0;
    let budgetEventCount = 0;

    events.forEach(e => {
      if (e.eventType) typeCounts[e.eventType] = (typeCounts[e.eventType] || 0) + 1;
      if (e.eventStatus) statusCounts[e.eventStatus] = (statusCounts[e.eventStatus] || 0) + 1;
      const cat = e.categories?.[0];
      if (cat) categories[cat] = (categories[cat] || 0) + 1;
      if (e.budget > 0) {
        totalBudget += e.budget;
        budgetEventCount++;
        if (cat) categoryBudgets[cat] = (categoryBudgets[cat] || 0) + e.budget;
      }
      if (e.eventCreationDate) {
        const date = new Date(e.eventCreationDate);
        if (!isNaN(date.getTime())) {
          const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
          months[key] = (months[key] || 0) + 1;
        }
      }
    });

    return { typeCounts, statusCounts, categories, categoryBudgets, months, totalBudget, budgetEventCount };
  }, [events]);

  const participantAggregates = useMemo(() => {
    const roleCounts = {};
    const statusCounts = {};
    const attendanceDistribution = {};
    const regMonths = {};
    let attendedCount = 0;

    participants.forEach(p => {
      const role = (p.roleId ? roleMap[p.roleId] : null) || 'Total';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      const status = p.participantStatus || 'Total';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      const attKey = p.participantStatus === 'ATTENDED' ? 'ATTENDED' : 'NOT_CONFIRMED';
      attendanceDistribution[attKey] = (attendanceDistribution[attKey] || 0) + 1;
      if (p.participantStatus === 'ATTENDED') attendedCount++;
      if (p.registrationDate) {
        const date = new Date(p.registrationDate);
        if (!isNaN(date.getTime())) {
          const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
          regMonths[key] = (regMonths[key] || 0) + 1;
        }
      }
    });

    return { roleCounts, statusCounts, attendanceDistribution, regMonths, attendedCount };
  }, [participants, roleMap]);

  const dependentAggregates = useMemo(() => {
    const ageGroups = {};
    dependents.forEach(d => {
      const age = d.age || 'unknown';
      ageGroups[age] = (ageGroups[age] || 0) + 1;
    });
    return { ageGroups };
  }, [dependents]);

  // Chart detailed info text using pre-computed aggregates
  const chartDetailedInfo = useMemo(() => ({
    eventType: {
      title: t('chartDetails.eventType.title'),
      description: t('chartDetails.eventType.description'),
      data: { totalEvents: events.length, typeCounts: eventAggregates.typeCounts }
    },
    eventStatus: {
      title: t('chartDetails.eventStatus.title'),
      description: t('chartDetails.eventStatus.description'),
      data: { totalEvents: events.length, statusCounts: eventAggregates.statusCounts }
    },
    topCategories: {
      title: t('chartDetails.topCategories.title'),
      description: t('chartDetails.topCategories.description'),
      data: { totalEvents: events.length, categories: eventAggregates.categories }
    },
    budgetDistribution: {
      title: t('chartDetails.budgetDistribution.title'),
      description: t('chartDetails.budgetDistribution.description'),
      data: {
        totalEvents: events.length,
        totalBudget: eventAggregates.totalBudget,
        averageBudget: eventAggregates.budgetEventCount > 0 ? eventAggregates.totalBudget / eventAggregates.budgetEventCount : 0,
        categoryBudgets: eventAggregates.categoryBudgets
      }
    },
    monthlyGrowth: {
      title: t('chartDetails.monthlyGrowth.title'),
      description: t('chartDetails.monthlyGrowth.description'),
      data: {
        totalEvents: events.length,
        monthlyData: Object.entries(eventAggregates.months).map(([month, count]) => ({ month, count }))
      }
    },
    participantRole: {
      title: t('chartDetails.participantRole.title'),
      description: t('chartDetails.participantRole.description'),
      data: { totalParticipants: participants.length, roleCounts: participantAggregates.roleCounts }
    },
    participantStatus: {
      title: t('chartDetails.participantStatus.title'),
      description: t('chartDetails.participantStatus.description'),
      data: { totalParticipants: participants.length, statusCounts: participantAggregates.statusCounts }
    },
    attendanceRate: {
      title: t('chartDetails.attendanceRate.title'),
      description: t('chartDetails.attendanceRate.description'),
      data: {
        totalParticipants: participants.length,
        attendedCount: participantAggregates.attendedCount,
        attendanceRate: participants.length ? (participantAggregates.attendedCount / participants.length * 100) : 0,
        attendanceDistribution: {
          [t('charts.attendanceRate.present')]: participantAggregates.attendanceDistribution['ATTENDED'] || 0,
          [t('charts.attendanceRate.notConfirmed')]: participantAggregates.attendanceDistribution['NOT_CONFIRMED'] || 0
        }
      }
    },
    registrationGrowth: {
      title: t('chartDetails.registrationGrowth.title'),
      description: t('chartDetails.registrationGrowth.description'),
      data: {
        totalParticipants: participants.length,
        monthlyData: Object.entries(participantAggregates.regMonths).map(([month, count]) => ({ month, count }))
      }
    },
    dependentAge: {
      title: t('chartDetails.dependentAge.title'),
      description: t('chartDetails.dependentAge.description'),
      data: {
        totalDependents: dependents.length,
        ageGroups: Object.entries(dependentAggregates.ageGroups).reduce((groups, [age, count]) => {
          const group = age === 'child' ? t('charts.dependentAge.child') :
                       age === 'baby' ? t('charts.dependentAge.baby') :
                       age === 'adult' ? t('charts.dependentAge.adult') :
                       t('charts.dependentAge.unknown');
          groups[group] = count;
          return groups;
        }, {})
      }
    },
    dependentsPerParticipant: {
      title: t('chartDetails.dependentsPerParticipant.title'),
      description: t('chartDetails.dependentsPerParticipant.description'),
      data: (() => {
        const dependentCounts = {};
        dependents.forEach(d => {
          dependentCounts[d.participantId] = (dependentCounts[d.participantId] || 0) + 1;
        });
        
        const distribution = Object.values(dependentCounts).reduce((dist, count) => {
          dist[count] = (dist[count] || 0) + 1;
          return dist;
        }, {});
        
        return {
          totalParticipantsWithDependents: Object.keys(dependentCounts).length,
          totalDependents: dependents.length,
          averageDependentsPerParticipant: Object.keys(dependentCounts).length > 0
            ? dependents.length / Object.keys(dependentCounts).length
            : 0,
          distribution
        };
      })()
    },
    dependentConversion: {
      title: t('chartDetails.dependentConversion.title'),
      description: t('chartDetails.dependentConversion.description'),
      data: (() => {
        // Criar map de participantes com dependentes
        const participantsWithDependentsObj = dependents.reduce((acc, dependent) => {
          if (dependent.participantId) {
            acc[dependent.participantId] = true;
          }
          return acc;
        }, {});
        
        const withDependents = { total: 0, attended: 0 };
        const withoutDependents = { total: 0, attended: 0 };

        // Contar participantes com e sem dependentes
        participants.forEach(participant => {
          const hasDependent = participantsWithDependentsObj[participant.id];
          
          if (hasDependent) {
            withDependents.total++;
            if (participant.participantStatus === 'ATTENDED') {
              withDependents.attended++;
            }
          } else {
            withoutDependents.total++;
            if (participant.participantStatus === 'ATTENDED') {
              withoutDependents.attended++;
            }
          }
        });

        // Calcular taxas de conversão
        const conversionRateWithDep = withDependents.total > 0 
          ? (withDependents.attended / withDependents.total) * 100 
          : 0;
        
        const conversionRateWithoutDep = withoutDependents.total > 0 
          ? (withoutDependents.attended / withoutDependents.total) * 100 
          : 0;

        return {
          totalParticipants: participants.length,
          participantsWithDependents: withDependents.total,
          participantsWithoutDependents: withoutDependents.total,
          attendedWithDependents: withDependents.attended,
          attendedWithoutDependents: withoutDependents.attended,
          conversionRates: {
            withDependents: parseFloat(conversionRateWithDep.toFixed(1)),
            withoutDependents: parseFloat(conversionRateWithoutDep.toFixed(1))
          },
          groupData: [
            {
              name: t('charts.dependentConversion.withDependents'),
              rate: parseFloat(conversionRateWithDep.toFixed(1))
            },
            {
              name: t('charts.dependentConversion.withoutDependents'),
              rate: parseFloat(conversionRateWithoutDep.toFixed(1))
            }
          ]
        };
      })()
    }
  }), [events, participants, dependents, eventAggregates, participantAggregates, dependentAggregates, t]);

  // Chart info text
  const chartInfoText = useMemo(() => ({
    eventType: t('chartInfo.eventType'),
    eventStatus: t('chartInfo.eventStatus'),
    topCategories: t('chartInfo.topCategories'),
    budgetDistribution: t('chartInfo.budgetDistribution'),
    monthlyGrowth: t('chartInfo.monthlyEvents'),
    participantRole: t('chartInfo.participantRole'),
    participantStatus: t('chartInfo.participantStatus'),
    attendanceRate: t('chartInfo.attendanceRate'),
    registrationGrowth: t('chartInfo.registrationGrowth'),
    dependentAge: t('chartInfo.dependentAge'),
    dependentsPerParticipant: t('chartInfo.dependentsPerParticipant'),
    dependentConversion: t('chartInfo.dependentConversion')
  }), [t]);

  // Memoize chart options
  const chartOptions = useMemo(() => ({
    eventType: getEventTypeDistributionOption(events, t),
    eventStatus: getEventStatusOption(events, t),
    topCategories: getTopCategoriesOption(events, t),
    budgetDistribution: getBudgetDistributionOption(events, t),
    monthlyGrowth: getMonthlyGrowthOption(events, t),
    participantRole: getParticipantRoleOption(participants, t, roleMap),
    participantStatus: getParticipantStatusOption(participants, t),
    attendanceRate: getAttendanceRateOption(participants, t),
    registrationGrowth: getRegistrationGrowthOption(participants, t),
    dependentAge: getDependentAgeDistributionOption(dependents, t),
    dependentsPerParticipant: getDependentsPerParticipantOption(dependents, t),
    dependentConversion: getDependentConversionRate(dependents, participants, t)
  }), [events, participants, dependents, t, roleMap]);

  // Memoize event charts
  const eventCharts = useMemo(() => (
    <>
      <AnimatedChartContainer 
        key="event-type" 
        title={t('eventCharts.eventType')} 
        icon={FiPieChart}
        chartInfo={chartInfoText.eventType}
        detailedInfo={chartDetailedInfo.eventType}
      >
        <MemoizedEChart option={chartOptions.eventType} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="event-status" 
        title={t('eventCharts.eventStatus')} 
        icon={FiCalendar}
        chartInfo={chartInfoText.eventStatus}
        detailedInfo={chartDetailedInfo.eventStatus}
      >
        <MemoizedEChart option={chartOptions.eventStatus} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="top-categories" 
        title={t('eventCharts.topCategories')} 
        icon={FiPieChart}
        chartInfo={chartInfoText.topCategories}
        detailedInfo={chartDetailedInfo.topCategories}
      >
        <MemoizedEChart option={chartOptions.topCategories} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="budget-distribution" 
        title={t('eventCharts.budgetDistribution')} 
        icon={FiBarChart2}
        chartInfo={chartInfoText.budgetDistribution}
        detailedInfo={chartDetailedInfo.budgetDistribution}
      >
        <MemoizedEChart option={chartOptions.budgetDistribution} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="monthly-growth" 
        title={t('eventCharts.monthlyGrowth')} 
        icon={FiTrendingUp}
        chartInfo={chartInfoText.monthlyGrowth}
        detailedInfo={chartDetailedInfo.monthlyGrowth}
      >
        <MemoizedEChart option={chartOptions.monthlyGrowth} />
      </AnimatedChartContainer>
    </>
  ), [chartOptions, chartInfoText, chartDetailedInfo, t]);

  // Memoize participant charts
  const participantCharts = useMemo(() => {
    const charts = {
      role: (
        <AnimatedChartContainer 
          key="participant-role" 
          title={t('participantCharts.participantRole')} 
          icon={FiUsers}
          chartInfo={chartInfoText.participantRole}
          detailedInfo={chartDetailedInfo.participantRole}
        >
          <MemoizedEChart option={chartOptions.participantRole} />
        </AnimatedChartContainer>
      ),
      status: (
        <AnimatedChartContainer 
          key="participant-status" 
          title={t('participantCharts.participantStatus')} 
          icon={FiUsers}
          chartInfo={chartInfoText.participantStatus}
          detailedInfo={chartDetailedInfo.participantStatus}
        >
          <MemoizedEChart option={chartOptions.participantStatus} />
        </AnimatedChartContainer>
      ),
      attendance: (
        <AnimatedChartContainer 
          key="attendance-rate" 
          title={t('participantCharts.attendanceRate')} 
          icon={FiUsers}
          chartInfo={chartInfoText.attendanceRate}
          detailedInfo={chartDetailedInfo.attendanceRate}
        >
          <MemoizedEChart option={chartOptions.attendanceRate} />
        </AnimatedChartContainer>
      ),
      growth: (
        <AnimatedChartContainer 
          key="registration-growth" 
          title={t('participantCharts.registrationGrowth')} 
          icon={FiTrendingUp}
          chartInfo={chartInfoText.registrationGrowth}
          detailedInfo={chartDetailedInfo.registrationGrowth}
        >
          <MemoizedEChart option={chartOptions.registrationGrowth} />
        </AnimatedChartContainer>
      )
    };

    if (specificCharts.length === 0) {
      return Object.values(charts);
    }
    return specificCharts.map(chartKey => charts[chartKey]);
  }, [chartOptions, specificCharts, t, chartInfoText, chartDetailedInfo]);

  // Memoize dependent charts
  const dependentCharts = useMemo(() => (
    <>
      <AnimatedChartContainer 
        key="dependents-per-participant" 
        title={t('dependentsCharts.dependentsPerParticipant')} 
        icon={FiUserPlus}
        chartInfo={chartInfoText.dependentsPerParticipant}
        detailedInfo={chartDetailedInfo.dependentsPerParticipant}
      >
        <MemoizedEChart option={chartOptions.dependentsPerParticipant} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="dependent-age" 
        title={t('dependentsCharts.dependentAge')} 
        icon={FiPieChart}
        chartInfo={chartInfoText.dependentAge}
        detailedInfo={chartDetailedInfo.dependentAge}
      >
        <MemoizedEChart option={chartOptions.dependentAge} />
      </AnimatedChartContainer>

      <AnimatedChartContainer 
        key="dependent-conversion" 
        title={t('dependentsCharts.dependentConversion')} 
        icon={FiTrendingUp}
        chartInfo={chartInfoText.dependentConversion}
        detailedInfo={chartDetailedInfo.dependentConversion}
      >
        <MemoizedEChart option={chartOptions.dependentConversion} />
      </AnimatedChartContainer>
    </>
  ), [chartOptions, t, chartInfoText, chartDetailedInfo]);

  // Memoize tabs configuration
  const tabs = useMemo(() => [
    { label: t('tabs.events'), value: "events", icon: FiCalendar },
    { label: t('tabs.participants'), value: "participants", icon: FiUsers },
    { label: t('tabs.dependents'), value: "dependents", icon: FiUserPlus }
  ], [t]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {showTabs && (
          <div className="flex justify-between mb-6">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <div key={tab.value}
                  className="h-10 w-24 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <ChartSkeleton key={index} type={index % 3 === 0 ? 'pie' : index % 3 === 1 ? 'bar' : 'line'} />
          ))}
        </div>
      </div>
    );
  }

  // Define which charts to show based on active tab
  const renderCharts = () => {
    switch (activeTab) {
      case 'events':
        return eventCharts;
      case 'participants':
        return participantCharts;
      case 'dependents':
        return dependentCharts;
      default:
        return eventCharts; // Default to events if something goes wrong
    }
  };

  return (
    <div className="space-y-6">
      {showTabs && (
        <div className="flex flex-col md:flex-row md:justify-between mb-6 gap-4">
          <div className="flex flex-wrap gap-2 md:gap-4">
            {tabs.map(tab => (
              <TabButton
                key={tab.value}
                label={tab.label}
                value={tab.value}
                icon={tab.icon}
                isActive={activeTab === tab.value}
                onClick={setActiveTab}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderCharts()}
      </div>
    </div>
  );
};

DashboardChart.propTypes = {
  events: PropTypes.array,
  participants: PropTypes.array,
  dependents: PropTypes.array,
  showTabs: PropTypes.bool,
  specificCharts: PropTypes.array,
  isLoading: PropTypes.bool
};

DashboardChart.displayName = 'DashboardChart';

export default React.memo(DashboardChart);