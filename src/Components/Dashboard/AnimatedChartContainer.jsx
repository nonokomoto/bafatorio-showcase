import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiMaximize2, FiMinimize2, FiInfo } from 'react-icons/fi';
import { Text } from '../UI'; // Import Text component
import { createPortal } from 'react-dom'; // Importar createPortal

export const AnimatedChartContainer = ({ children, title, icon: Icon, delay = 0, chartInfo = null, detailedInfo = null }) => {
  const { t } = useTranslation('dashboard');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const toggleExpand = useCallback((e) => {
    e?.stopPropagation();
    setIsExpanded(!isExpanded);
    // Reset info panel when closing
    if (isExpanded) setShowInfo(false);
  }, [isExpanded]);

  const toggleInfo = useCallback((e) => {
    e?.stopPropagation();
    setShowInfo(!showInfo);
  }, [showInfo]);

  // Format numbers for display
  const formatNumber = useCallback((num) => {
    if (num === undefined || num === null) return '0';
    if (typeof num === 'number') {
      // Format with commas for thousands
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: Number.isInteger(num) ? 0 : 2
      });
    }
    return num.toString();
  }, []);

  // Render detailed info as cards with stats
  const renderDetailedInfo = useMemo(() => {
    if (!detailedInfo) return null;
    
    const { title, description, data } = detailedInfo;
    
    // Extract main metrics - this will handle different data structures
    const metrics = [];
    if (data) {
      // Add common metrics based on data structure
      if (data.totalEvents !== undefined) {
        metrics.push({ label: t('metrics.totalEvents'), value: formatNumber(data.totalEvents) });
      }
      if (data.totalParticipants !== undefined) {
        metrics.push({ label: t('metrics.totalParticipants'), value: formatNumber(data.totalParticipants) });
      }
      if (data.totalDependents !== undefined) {
        metrics.push({ label: t('metrics.totalDependents'), value: formatNumber(data.totalDependents) });
      }
      if (data.totalBudget !== undefined) {
        metrics.push({ 
          label: t('metrics.totalBudget'), 
          value: formatNumber(data.totalBudget),
          prefix: '€' 
        });
      }
      if (data.averageBudget !== undefined) {
        metrics.push({ 
          label: t('metrics.averageBudget'), 
          value: formatNumber(data.averageBudget),
          prefix: '€' 
        });
      }
      if (data.averageDependentsPerParticipant !== undefined) {
        metrics.push({ 
          label: t('metrics.avgDependentsPerParticipant'), 
          value: formatNumber(data.averageDependentsPerParticipant)
        });
      }
      if (data.attendanceRate !== undefined) {
        metrics.push({ 
          label: t('metrics.attendanceRate'), 
          value: formatNumber(data.attendanceRate),
          suffix: '%' 
        });
      }
    }

    // Handle distribution data for detailed breakdowns
    const getDistributionItems = () => {
      if (!data) return [];
      
      // Look for various types of distribution data
      const distributions = [];
      
      if (data.typeCounts) {
        distributions.push({
          title: t('distributions.byType'),
          data: Object.entries(data.typeCounts).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalEvents ? Math.round((value / data.totalEvents) * 100) : 0 
          }))
        });
      }
      
      if (data.statusCounts) {
        distributions.push({
          title: t('distributions.byStatus'),
          data: Object.entries(data.statusCounts).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalEvents || data.totalParticipants ? 
              Math.round((value / (data.totalEvents || data.totalParticipants)) * 100) : 0 
          }))
        });
      }
      
      if (data.roleCounts) {
        distributions.push({
          title: t('distributions.byRole'),
          data: Object.entries(data.roleCounts).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalParticipants ? Math.round((value / data.totalParticipants) * 100) : 0 
          }))
        });
      }
      
      if (data.categories) {
        distributions.push({
          title: t('distributions.byCategory'),
          data: Object.entries(data.categories).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalEvents ? Math.round((value / data.totalEvents) * 100) : 0 
          }))
        });
      }
      
      if (data.ageGroups) {
        distributions.push({
          title: t('distributions.byAgeGroup'),
          data: Object.entries(data.ageGroups).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalDependents ? Math.round((value / data.totalDependents) * 100) : 0 
          }))
        });
      }
      
      if (data.categoryBudgets) {
        distributions.push({
          title: t('distributions.budgetByCategory'),
          data: Object.entries(data.categoryBudgets).map(([key, value]) => ({ 
            label: key, 
            value, 
            percentage: data.totalBudget ? Math.round((value / data.totalBudget) * 100) : 0,
            prefix: '€'
          }))
        });
      }
      
      if (data.distribution) {
        distributions.push({
          title: t('distributions.dependentsDistribution'),
          data: Object.entries(data.distribution).map(([key, value]) => ({ 
            label: `${key} ${t('dependents')}`, 
            value, 
            percentage: data.totalParticipantsWithDependents ? 
              Math.round((value / data.totalParticipantsWithDependents) * 100) : 0 
          }))
        });
      }
      
      // Time series data
      if (data.monthlyData) {
        const sortedData = [...data.monthlyData].sort((a, b) => {
          const [aMonth, aYear] = a.month.split('/');
          const [bMonth, bYear] = b.month.split('/');
          return (aYear - bYear) || (aMonth - bMonth);
        });
        
        distributions.push({
          title: t('distributions.byMonth'),
          data: sortedData.map(({month, count}) => ({
            label: month,
            value: count,
            percentage: 0 // No percentage for time series
          })),
          type: 'timeline'
        });
      }
      
      return distributions;
    };

    const distributions = getDistributionItems();

    return (
      <div className="space-y-3 animate-fadeIn">
        {title && (
          <div className="border-b border-border pb-1">
            <Text variant="subtitle1" weight="medium" className="text-foreground">
              {title}
            </Text>
            {description && (
              <Text variant="caption" className="text-muted-foreground">
                {description}
              </Text>
            )}
          </div>
        )}
        
        {/* Key metrics section */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {metrics.map((metric, idx) => (
              <div 
                key={idx} 
                className="bg-card p-2 rounded-md shadow-sm border border-border
                           hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-150 group"
              >
                <Text variant="caption" weight="medium" className="text-muted-foreground">
                  {metric.label}
                </Text>
                <div className="text-text-900 dark:text-text-50 flex items-baseline mt-0.5">
                  {metric.prefix && (
                    <Text variant="caption" className="text-primary-500 mr-1 group-hover:text-primary-600">
                      {metric.prefix}
                    </Text>
                  )}
                  <Text variant="h5" weight="bold" className="group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-150">
                    {metric.value}
                  </Text>
                  {metric.suffix && (
                    <Text variant="caption" className="text-primary-500 ml-1 group-hover:text-primary-600">
                      {metric.suffix}
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Distributions section */}
        {distributions.length > 0 && (
          <div className="space-y-3">
            <Text variant="subtitle2" weight="medium" className="text-foreground border-b border-border pb-1">
              {t('chartDetails.distributions')}
            </Text>
            
            {distributions.map((dist, idx) => (
              <div 
                key={idx} 
                className="bg-card p-2 rounded-md shadow-sm border border-border
                          hover:shadow transition-all duration-200"
              >
                <Text variant="subtitle2" weight="medium" className="text-foreground mb-1.5 flex items-center text-xs">
                  <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-1.5"></span>
                  {dist.title}
                </Text>
                
                {dist.type === 'timeline' ? (
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-background-300">
                    <div className="flex items-end space-x-1 min-w-max pt-2 pb-1">
                      {dist.data.map((item, i) => (
                        <div key={i} className="flex flex-col items-center group">
                          <Text variant="caption" weight="medium" className="text-primary-600 dark:text-primary-400 mb-1">
                            {item.value}
                          </Text>
                          <div
                            className="w-7 bg-primary-500 hover:bg-primary-600 rounded-t-sm transition-all duration-200 relative group-hover:opacity-90"
                            style={{ height: `${Math.max(12, Math.min(50, item.value * 2))}px` }}
                          >
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-background-700 text-white px-1.5 py-0.5 rounded text-xs opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
                              {item.value}
                            </div>
                          </div>
                          <Text variant="caption" className="text-muted-foreground mt-1 text-xs font-medium transform rotate-315 origin-top-left h-5 whitespace-nowrap">
                            {item.label}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dist.data.sort((a, b) => b.value - a.value).map((item, i) => (
                      <div key={i} className="flex items-center group hover:bg-accent hover:bg-opacity-20 p-1 rounded transition-colors duration-200">
                        <Text variant="caption" className="text-muted-foreground w-1/3 truncate pr-2 font-medium">
                          {item.label}
                        </Text>
                        <div className="w-1/3 flex-grow">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-primary-500 group-hover:bg-primary-600 transition-all duration-200"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-1/3 text-xs text-muted-foreground pl-2 flex items-baseline">
                          {item.prefix && (
                            <Text variant="caption" className="text-primary-500 mr-1">
                              {item.prefix}
                            </Text>
                          )}
                          <Text variant="caption" weight="medium" className="text-foreground">
                            {formatNumber(item.value)}
                          </Text>
                          {item.percentage > 0 && (
                            <Text variant="caption" className="text-muted-foreground text-xs ml-1 bg-muted px-1 py-0.5 rounded">
                              {item.percentage}%
                            </Text>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* No data available message */}
        {(!metrics.length && !distributions.length) && (
          <div className="text-center py-3 text-muted-foreground bg-card rounded-md border border-border">
            <div className="inline-block bg-muted p-2 rounded-full mb-1">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Text variant="caption" className="text-muted-foreground">
              {t('noDataAvailable')}
            </Text>
          </div>
        )}
      </div>
    );
  }, [detailedInfo, t, formatNumber]);

  return (
    <>
      {isExpanded && createPortal(
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
            transition: 'all 0.3s ease-in-out'
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(e);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-card p-4 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-fadeIn"
            style={{
              position: 'relative',
              isolation: 'isolate',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              transform: 'scale(1)',
              transition: 'transform 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Icon className="w-5 h-5 text-primary-500 mr-2 animate-pulse-subtle" />
                <Text variant="subtitle2" weight="medium" className="text-foreground font-display text-base">
                  {title}
                </Text>
              </div>
              <div className="flex items-center space-x-1">
                {chartInfo && (
                  <button
                    onClick={toggleInfo}
                    className="p-1.5 rounded-full hover:bg-accent hover:bg-opacity-10 transition-colors duration-200
                             text-muted-foreground hover:text-primary-500 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    title={t('common.information')}
                    aria-label={t('common.information')}
                  >
                    <FiInfo className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={toggleExpand}
                  className="p-1.5 rounded-full hover:bg-accent hover:bg-opacity-10 transition-colors duration-200
                           text-muted-foreground hover:text-primary-500 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  title={t('common.minimize')}
                  aria-label={t('common.minimize')}
                >
                  <FiMinimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {showInfo && chartInfo && (
              <div className="mb-3 p-2 bg-card rounded-md text-xs text-muted-foreground
                            animate-fadeIn border-l-2 border-primary-500">
                <Text variant="caption" className="text-muted-foreground">
                  {chartInfo}
                </Text>
              </div>
            )}
            
            {detailedInfo && renderDetailedInfo}
            
            <div className="mt-4 flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {!isExpanded && (
        <div
          className={`bg-card ${isExpanded ? 'p-3' : 'p-4'} rounded-lg shadow-sm
            transition-all duration-300 ease-in-out hover:shadow-md
            ${isExpanded ? 'fixed z-50 overflow-auto' : 'relative h-full'}`}
          style={{
            animation: `fadeIn 0.5s ease-out ${delay}ms both`,
            minHeight: isExpanded ? 'auto' : '300px',
            maxHeight: isExpanded ? '75vh' : 'auto',
            maxWidth: isExpanded ? '80vw' : 'auto',
            margin: isExpanded ? '0 auto' : '0',
            left: isExpanded ? '50%' : 'auto',
            top: isExpanded ? '50%' : 'auto',
            transform: isExpanded ? 'translate(-50%, -50%)' : 'none',
            backdropFilter: isExpanded ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: isExpanded ? 'blur(8px)' : 'none'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Icon className={`w-5 h-5 text-primary-500 mr-2 ${isExpanded ? 'animate-pulse-subtle' : ''}`} />
              <Text variant="subtitle2" weight="medium" className="text-foreground font-display text-base">
                {title}
              </Text>
            </div>
            <div className="flex items-center space-x-1">
              {chartInfo && (
                <button
                  onClick={toggleInfo}
                  className="p-1.5 rounded-full hover:bg-accent hover:bg-opacity-10 transition-colors duration-200
                           text-muted-foreground hover:text-primary-500 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  title={t('common.information')}
                  aria-label={t('common.information')}
                >
                  <FiInfo className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={toggleExpand}
                className="p-1.5 rounded-full hover:bg-accent hover:bg-opacity-10 transition-colors duration-200
                         text-muted-foreground hover:text-primary-500 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                title={isExpanded ? t('common.minimize') : t('common.maximize')}
                aria-label={isExpanded ? t('common.minimize') : t('common.maximize')}
              >
                {isExpanded ? <FiMinimize2 className="w-3.5 h-3.5" /> : <FiMaximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          
          {showInfo && chartInfo && (
            <div className="mb-2 p-2 bg-card rounded-md text-xs text-muted-foreground
                          animate-fadeIn border-l-2 border-primary-500">
              <Text variant="caption" className="text-muted-foreground">
                {chartInfo}
              </Text>
            </div>
          )}
          
          {isExpanded && detailedInfo && renderDetailedInfo}
          
          <div className={`${isExpanded ? 'mt-3' : ''}`}>
            {children}
          </div>
          
          {isExpanded && (
            <button
              onClick={toggleExpand}
              className="mt-3 mx-auto flex items-center text-xs text-muted-foreground hover:text-primary-500 transition-colors duration-200
                       p-1 px-2 rounded-full hover:bg-accent hover:bg-opacity-10 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label={t('common.minimize')}
            >
              <FiMinimize2 className="w-3.5 h-3.5 mr-1" />
              <Text variant="caption" className="text-muted-foreground hover:text-primary-500 transition-colors duration-200">
                {t('common.minimize')}
              </Text>
            </button>
          )}
        </div>
      )}
      
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 animate-fadeIn" 
          onClick={toggleExpand}
          style={{ backdropFilter: 'blur(2px)' }}
        />
      )}
    </>
  );
};

AnimatedChartContainer.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  delay: PropTypes.number,
  chartInfo: PropTypes.string,
  detailedInfo: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    data: PropTypes.object
  })
};