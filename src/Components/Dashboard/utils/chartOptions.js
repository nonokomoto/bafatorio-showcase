import { formatCurrency } from './formatters';

// Color constants
const COLORS = {
  primary: '#3b82f6', // Primary light     
  secondary: '#16a34a',    
  accent: '#0093EB',       
  success: '#10b981',      
  warning: '#f59e0b',      
  error: '#ef4444',        
  media: '#8b5cf6',        
  vip: '#1f2937',          
  gray: '#4b5563',              
};

// Status colors
const PARTICIPANT_STATUS_COLORS = {
  REGISTERED: COLORS.primary,
  CONFIRMED: COLORS.warning,
  CANCELLED: COLORS.error,
  ATTENDED: COLORS.success,
  PENDING: COLORS.warning
};

// Role colors
const ROLE_COLORS = {
  attendee: COLORS.primary,
  media: COLORS.media,
  team: COLORS.secondary,
  vip: COLORS.vip
};

// Event status colors
const EVENT_STATUS_COLORS = {
  SCHEDULED: COLORS.primary,
  ONGOING: COLORS.warning,
  COMPLETED: COLORS.success,
  CANCELLED: COLORS.error,
  PENDING: COLORS.warning
};

// Event type colors
const EVENT_TYPE_COLORS = {
  public: COLORS.accent,
  private: COLORS.media,
  other: COLORS.gray
};

// Event Category Colors
const categoryColorMap = {
    'Corporativo': COLORS.media,
    'Pessoal': COLORS.accent,
  };

// Event Charts Options
export const getEventTypeDistributionOption = (events, t) => {
  const eventTypes = events?.reduce((acc, event) => {
    const type = event.eventType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: '0%',
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(eventTypes).map(([type, value]) => ({
        name: type === 'public' ? t('charts.eventTypes.public') :
              type === 'private' ? t('charts.eventTypes.private') : t('charts.eventTypes.other'),
        value,
        itemStyle: {
          color: EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other
        }
      }))
    }]
  };
};

export const getEventStatusOption = (events, t) => {
  const statusData = events?.reduce((acc, event) => {
    // Normalizar para uppercase e definir PENDING como padrão
    const status = (event.eventStatus || 'PENDING').toUpperCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      bottom: '5%',
      left: 'center'
    },
    series: [{
      type: 'pie',
      radius: '50%',
      data: Object.entries(statusData).map(([status, value]) => ({
        name: status === 'SCHEDULED' ? t('charts.eventStatus.scheduled') :
              status === 'ONGOING' ? t('charts.eventStatus.ongoing') :
              status === 'COMPLETED' ? t('charts.eventStatus.completed') :
              status === 'CANCELLED' ? t('charts.eventStatus.cancelled') : 
              t('charts.eventStatus.pending'), // Padrão para pending
        value,
        itemStyle: {
          color: EVENT_STATUS_COLORS[status] || EVENT_STATUS_COLORS.PENDING
        }
      }))
    }]
  };
};

export const getTopCategoriesOption = (events, t) => {
    const categories = events?.reduce((acc, event) => {
      const category = event.categories?.[0] || t('charts.categories.uncategorized');
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  
    const topCategories = Object.entries(categories || {})
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: topCategories.map(item => item.name),
        axisLabel: { 
          color: '#4b5563',
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4b5563' }
      },
      series: [{
        name: t('charts.series.eventCount'),
        type: 'bar',
        data: topCategories.map((item) => ({
          value: item.count,
          itemStyle: {
            color: categoryColorMap[item.name] || COLORS.gray
          }
        }))
      }]
    };
};
  
export const getBudgetDistributionOption = (events, t) => {
    const budgetByCategory = events?.reduce((acc, event) => {
      const category = event.categories?.[0] || t('charts.categories.uncategorized');
      acc[category] = (acc[category] || 0) + (event.budget || 0);
      return acc;
    }, {});
  
    const sortedData = Object.entries(budgetByCategory || {})
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const value = params[0].value;
          return `${params[0].name}: ${formatCurrency(value)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(item => item.category),
        axisLabel: { 
          color: '#4b5563',
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#4b5563',
          formatter: value => formatCurrency(value)
        }
      },
      series: [{
        name: t('charts.series.budgetTotal'),
        type: 'bar',
        data: sortedData.map((item) => ({
          value: item.total,
          itemStyle: { color: categoryColorMap[item.category] || COLORS.gray }
        })),
      }]
    };
};
  
export const getMonthlyGrowthOption = (events, t) => {
    const monthlyData = events?.reduce((acc, event) => {
      if (!event.eventCreationDate) return acc;
      const date = new Date(event.eventCreationDate);
      if (isNaN(date.getTime())) return acc;
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});
  
    const sortedData = Object.entries(monthlyData || {})
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(item => item.date),
        axisLabel: { color: '#4b5563' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4b5563' }
      },
      series: [{
        name: t('charts.series.eventCount'),
        type: 'line',
        smooth: true,
        data: sortedData.map(item => item.count),
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(37, 99, 235, 0.3)'
            }, {
              offset: 1, color: 'rgba(37, 99, 235, 0.05)'
            }]
          }
        }
      }]
    };
};

// Participant Charts Options
export const getParticipantRoleOption = (participants, t, roleMap = {}) => {
  const roleData = participants?.reduce((acc, participant) => {
    // Resolve roleId via roleMap, fallback to 'attendee'
    const role = (participant.roleId ? (roleMap[participant.roleId] || 'attendee') : 'attendee').toLowerCase();
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      bottom: '-10%'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(roleData).map(([role, value]) => ({
        name: role === 'attendee' ? t('charts.roles.attendee') :
              role === 'media' ? t('charts.roles.media') :
              role === 'team' ? t('charts.roles.team') :
              role === 'vip' ? t('charts.roles.vip') :
              t('charts.roles.unknown'),
        value,
        itemStyle: {
          color: ROLE_COLORS[role] || COLORS.gray
        }
      }))
    }]
  };
};

export const getParticipantStatusOption = (participants, t) => {
    // Normalize the status values to ensure consistent mapping
    const statusData = participants?.reduce((acc, participant) => {
      // Normalize to uppercase and default to PENDING if not set
      const status = (participant.participantStatus || 'PENDING').toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  
    // Primeiro transformar statusData em um array com nomes traduzidos
    const processedData = Object.entries(statusData || {}).map(([status, count]) => ({
      status: status,  // Armazenar o status original para referência
      name: status === 'REGISTERED' ? t('charts.participantStatus.registered') :
            status === 'CONFIRMED' ? t('charts.participantStatus.confirmed') :
            status === 'CANCELLED' ? t('charts.participantStatus.cancelled') :
            status === 'ATTENDED' ? t('charts.participantStatus.attended') :
            t('charts.participantStatus.pending'), // Default to pending for any other status
      value: count,
      itemStyle: {
        color: PARTICIPANT_STATUS_COLORS[status] || PARTICIPANT_STATUS_COLORS.PENDING
      }
    }));
  
    // Consolidar dados para evitar duplicação de nomes nas legendas
    const consolidatedData = {};
    processedData.forEach(item => {
      if (!consolidatedData[item.name]) {
        consolidatedData[item.name] = {
          name: item.name,
          value: item.value,
          itemStyle: item.itemStyle
        };
      } else {
        consolidatedData[item.name].value += item.value;
      }
    });
    
    // Converter de volta para array
    const finalData = Object.values(consolidatedData);
    
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: finalData.map(item => item.name),
        axisLabel: { color: '#4b5563' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4b5563' }
      },
      series: [{
        name: t('charts.series.total'),
        type: 'bar',
        data: finalData,
        emphasis: { focus: 'series' }
      }]
    };
};
  
export const getAttendanceRateOption = (participants, t) => {
    const attendanceData = participants?.reduce((acc, participant) => {
      const key = participant.participantStatus === 'ATTENDED' ? 'ATTENDED' : 'NOT_CONFIRMED';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Calculate total and percentage values
    const total = Object.values(attendanceData || {}).reduce((a, b) => a + b, 0);
    const processedData = Object.entries(attendanceData || {}).map(([key, count]) => ({
      name: key === 'ATTENDED' ? t('charts.attendanceRate.present') : t('charts.attendanceRate.notConfirmed'),
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      itemStyle: {
        color: key === 'ATTENDED' ? COLORS.success : COLORS.error
      }
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '-10%'
      },
      series: [{
        name: t('charts.series.attendanceRate'),
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        data: processedData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          },
          label: {
            show: true,
            fontWeight: 'bold'
          }
        }
      }]
    };
};
  
export const getRegistrationGrowthOption = (participants, t) => {
    const monthlyData = participants?.reduce((acc, participant) => {
      if (!participant.registrationDate) return acc;
      const date = new Date(participant.registrationDate);
      if (isNaN(date.getTime())) return acc;
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});
  
    const sortedData = Object.entries(monthlyData || {})
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(item => item.date),
        axisLabel: { color: '#4b5563' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4b5563' }
      },
      series: [{
        name: t('charts.series.registrations'),
        type: 'line',
        smooth: true,
        data: sortedData.map(item => item.count),
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(37, 99, 235, 0.3)'
            }, {
              offset: 1, color: 'rgba(37, 99, 235, 0.05)'
            }]
          }
        }
      }]
    };
};

// Dependent Charts Options
export const getDependentAgeDistributionOption = (dependents, t) => {
  const ageGroups = dependents?.reduce((acc, dependent) => {
    const age = dependent.age || 'unknown';
    const group = age === 'child' ? t('charts.dependentAge.child') :
                 age === 'baby' ? t('charts.dependentAge.baby') :
                 age === 'adult' ? t('charts.dependentAge.adult') : 
                 t('charts.dependentAge.unknown');
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {}) || {};

  const colorMap = {
    [t('charts.dependentAge.child')]: COLORS.accent,
    [t('charts.dependentAge.baby')]: COLORS.warning,
    [t('charts.dependentAge.adult')]: COLORS.success,
    [t('charts.dependentAge.unknown')]: COLORS.gray
  };

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: '5%',
      left: 'center'
    },
    series: [{
      type: 'pie',
      radius: '50%',
      data: Object.entries(ageGroups).map(([group, value]) => ({
        name: group,
        value,
        itemStyle: {
          color: colorMap[group]
        }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };
};

export const getDependentsPerParticipantOption = (dependents, t) => {
  if (!Array.isArray(dependents) || dependents.length === 0) {
    return {
      tooltip: { trigger: 'item' },
      series: [{ type: 'gauge', data: [] }]
    };
  }

  const participantDependents = dependents.reduce((acc, dependent) => {
    if (!dependent.participantId) return acc;
    acc[dependent.participantId] = (acc[dependent.participantId] || 0) + 1;
    return acc;
  }, {});

  const totalParticipants = Object.keys(participantDependents).length;
  const totalDependents = Object.values(participantDependents).reduce((sum, count) => sum + count, 0);
  const average = totalParticipants ? (totalDependents / totalParticipants) : 0;

  return {
    tooltip: {
      formatter: '{b}: {c}'
    },
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: Math.max(5, Math.ceil(average)),
      itemStyle: {
        color: '#2563eb'
      },
      progress: {
        show: true,
        roundCap: true,
        width: 18
      },
      pointer: {
        show: false
      },
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 18
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      },
      axisLabel: {
        show: true,
        distance: -60,
        color: '#999',
        fontSize: 16
      },
      title: {
        show: true,
        offsetCenter: [0, '80%'],
        fontSize: 16,
        color: '#666',
        formatter: t('charts.dependentsPerParticipant.title')
      },
      detail: {
        fontSize: 40,
        offsetCenter: [0, '20%'],
        valueAnimation: true,
        color: '#2563eb',
        formatter: function(value) {
          return value.toFixed(1);
        }
      },
      data: [{
        value: average,
        name: t('charts.dependentsPerParticipant.name')
      }]
    }]
  };
};

export const getDependentConversionRate = (dependents, participants, t) => {
  if (!Array.isArray(dependents) || !Array.isArray(participants) || dependents.length === 0 || participants.length === 0) {
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [] }]
    };
  }

  // Criar map de participantes com dependentes
  const participantsWithDependents = dependents.reduce((acc, dependent) => {
    if (dependent.participantId) {
      acc[dependent.participantId] = true;
    }
    return acc;
  }, {});

  // Contar participantes com e sem dependentes
  const groupA = { total: 0, attended: 0 }; // Com dependentes
  const groupB = { total: 0, attended: 0 }; // Sem dependentes

  participants.forEach(participant => {
    const hasDependent = participantsWithDependents[participant.id];
    
    if (hasDependent) {
      groupA.total++;
      if (participant.participantStatus === 'ATTENDED') {
        groupA.attended++;
      }
    } else {
      groupB.total++;
      if (participant.participantStatus === 'ATTENDED') {
        groupB.attended++;
      }
    }
  });

  // Calcular taxas de conversão
  const conversionRateA = groupA.total > 0 ? (groupA.attended / groupA.total) * 100 : 0;
  const conversionRateB = groupB.total > 0 ? (groupB.attended / groupB.total) * 100 : 0;

  const data = [
    {
      name: t('charts.dependentConversion.withDependents'),
      value: parseFloat(conversionRateA.toFixed(1)),
      itemStyle: { color: '#3b82f6' }
    },
    {
      name: t('charts.dependentConversion.withoutDependents'),
      value: parseFloat(conversionRateB.toFixed(1)),
      itemStyle: { color: '#10b981' }
    }
  ];

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const dataPoint = params[0];
        return `${dataPoint.name}: ${dataPoint.value}%`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: { 
        color: '#4b5563',
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: t('charts.dependentConversion.attendanceRate'),
      nameLocation: 'middle',
      nameGap: 50,
      min: 0,
      max: 100,
      axisLabel: { 
        color: '#4b5563',
        formatter: '{value}%'
      }
    },
    series: [{
      name: t('charts.dependentConversion.conversionRate'),
      type: 'bar',
      barWidth: '40%',
      data: data,
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%'
      }
    }]
  };
};