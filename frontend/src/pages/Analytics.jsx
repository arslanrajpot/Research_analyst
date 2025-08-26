import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useResearch } from '../context/ResearchContext';
import { useDarkMode } from '../context/DarkModeContext';
import { researchAPI } from '../services/api';
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Dynamic chart data generation based on time range
const generateChartData = (timeRange, reports) => {
  const now = new Date();
  let startDate, interval, dateFormat, dataPoints;
  
  switch (timeRange) {
    case '7d':
      startDate = subDays(now, 7);
      interval = 'day';
      dateFormat = 'MMM dd';
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
      break;
    case '30d':
      startDate = subDays(now, 30);
      interval = 'day';
      dateFormat = 'MMM dd';
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
      break;
    case '90d':
      startDate = subDays(now, 90);
      interval = 'week';
      dateFormat = 'MMM dd';
      dataPoints = eachWeekOfInterval({ start: startDate, end: now });
      break;
    case '1y':
      startDate = subYears(now, 1);
      interval = 'month';
      dateFormat = 'MMM yyyy';
      dataPoints = eachMonthOfInterval({ start: startDate, end: now });
      break;
    default:
      startDate = subDays(now, 30);
      interval = 'day';
      dateFormat = 'MMM dd';
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
  }

  return dataPoints.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let reportsCount = 0;
    
    if (interval === 'day') {
      reportsCount = reports.filter(r => {
        const reportDate = new Date(r.createdAt);
        return format(reportDate, 'yyyy-MM-dd') === dateStr;
      }).length;
    } else if (interval === 'week') {
      const weekStart = startOfWeek(date);
      const weekEnd = endOfWeek(date);
      reportsCount = reports.filter(r => {
        const reportDate = new Date(r.createdAt);
        return reportDate >= weekStart && reportDate <= weekEnd;
      }).length;
    } else if (interval === 'month') {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      reportsCount = reports.filter(r => {
        const reportDate = new Date(r.createdAt);
        return reportDate >= monthStart && reportDate <= monthEnd;
      }).length;
    }

    return {
      date: format(date, dateFormat),
      reports: reportsCount,
      fullDate: date,
    };
  });
};

const Analytics = () => {
  const { reports, user, analytics, loadAnalytics, refreshReports } = useResearch();
  const { isDarkMode } = useDarkMode();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);
  const [debouncedTimeRange, setDebouncedTimeRange] = useState('30d');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const currentApiCallRef = useRef(null);

    // Fallback: If loading takes too long, show content anyway
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);



  // Load user profile data
  const loadUserProfile = async () => {
    try {
      setProfileLoading(true);
      const profileResponse = await researchAPI.getUserProfile();
      setUserProfile(profileResponse);
      console.log('User profile loaded in Analytics:', profileResponse);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Refresh reports when component mounts to ensure we have latest data
  useEffect(() => {
    if (!reportsLoaded && reports.length === 0) {
      refreshReports().then(() => {
        setReportsLoaded(true);
      }).catch(error => {
        console.error('Failed to refresh reports:', error);
      });
    }
  }, [reportsLoaded, reports.length, refreshReports, user]);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Listen for report generation events to refresh user profile
  useEffect(() => {
    const handleReportGenerated = () => {
      console.log('Report generated, refreshing user profile in Analytics...');
      loadUserProfile();
    };

    window.addEventListener('reportGenerated', handleReportGenerated);
    return () => {
      window.removeEventListener('reportGenerated', handleReportGenerated);
    };
  }, []);

















  // Generate dynamic chart data based on time range
  const chartData = useMemo(() => {
    // Use API data if available and matches current time range, otherwise fallback to generated data
    if (analyticsData && analyticsData.time_series_data && !error && analyticsData.time_range === debouncedTimeRange) {
      return analyticsData.time_series_data.map(item => ({
        date: format(new Date(item.date), debouncedTimeRange === '1y' ? 'MMM yyyy' : 'MMM dd'),
        reports: item.reports,
        fullDate: new Date(item.date),
      }));
    }
    
    return generateChartData(debouncedTimeRange, reports);
  }, [debouncedTimeRange, reports, analyticsData?.time_series_data, analyticsData?.time_range, error]);

  // Calculate analytics based on time range
  const calculateAnalytics = useMemo(() => {
    // Use API data if available and matches current time range, otherwise calculate from reports
    if (analyticsData && !error && analyticsData.time_range === debouncedTimeRange) {
      return {
        totalReports: analyticsData.total_reports || 0,
        changePercentage: analyticsData.change_percentage || 0,
        changeType: (analyticsData.change_percentage || 0) >= 0 ? 'positive' : 'negative',
        changeSign: (analyticsData.change_percentage || 0) >= 0 ? '+' : '',
        averageGenerationTime: analyticsData.average_generation_time || 0,
        successRate: analyticsData.success_rate || 0,
        errorRate: analyticsData.error_rate || 0,
        reportsPerDay: analyticsData.total_reports > 0 ? (analyticsData.total_reports / Math.max(1, debouncedTimeRange === '7d' ? 7 : debouncedTimeRange === '30d' ? 30 : debouncedTimeRange === '90d' ? 90 : 365)).toFixed(1) : 0,
        topTemplates: (analyticsData.popular_templates || []).map(t => [t.name, t.usage]),
        peakUsageTime: analyticsData.usage_trends?.peak_usage_time || 'N/A',
        mostActiveDayName: analyticsData.usage_trends?.most_active_day || 'N/A',
        averageSession: analyticsData.usage_trends?.average_session_duration || 0,
        reportsPerSession: analyticsData.usage_trends?.reports_per_session || 0,
      };
    }

    // Fallback calculation from reports
    const now = new Date();
    let startDate;
    
    switch (debouncedTimeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      default:
        startDate = subDays(now, 30);
    }

    const filteredReports = reports.filter(r => {
      const reportDate = new Date(r.createdAt);
      return reportDate >= startDate && reportDate <= now;
    });

    const totalReports = filteredReports.length;
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousPeriodReports = reports.filter(r => {
      const reportDate = new Date(r.createdAt);
      return reportDate >= previousPeriodStart && reportDate < startDate;
    }).length;

    const changePercentage = previousPeriodReports > 0 
      ? ((totalReports - previousPeriodReports) / previousPeriodReports * 100).toFixed(1)
      : totalReports > 0 ? 100 : 0;

    const changeType = totalReports >= previousPeriodReports ? 'positive' : 'negative';
    const changeSign = changeType === 'positive' ? '+' : '';

    // Calculate average generation time from real data
    const totalGenerationTime = filteredReports.reduce((sum, r) => sum + (r.generationTime || 0), 0);
    const averageGenerationTime = totalReports > 0 ? (totalGenerationTime / totalReports).toFixed(1) : 0;

    // Calculate success rate from real data
    const successfulReports = filteredReports.filter(r => r.status === 'completed').length;
    const successRate = totalReports > 0 ? ((successfulReports / totalReports) * 100).toFixed(1) : 0;

    // Calculate template usage
    const templateUsage = filteredReports.reduce((acc, report) => {
      acc[report.template] = (acc[report.template] || 0) + 1;
      return acc;
    }, {});

    const topTemplates = Object.entries(templateUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Calculate performance metrics
    const errorRate = totalReports > 0 ? (100 - parseFloat(successRate)).toFixed(1) : 0;
    const reportsPerDay = totalReports > 0 ? (totalReports / Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))).toFixed(1) : 0;

    // Calculate usage trends
    const hourCounts = {};
    const dayCounts = {};
    let totalSessionTime = 0;
    let totalSessions = 0;

    filteredReports.forEach(report => {
      const reportDate = new Date(report.createdAt);
      const hour = reportDate.getHours();
      const day = format(reportDate, 'EEEE');
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      
      if (report.generationTime) {
        totalSessionTime += report.generationTime;
        totalSessions++;
      }
    });

    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
    const peakUsageTime = peakHour ? `${peakHour[0]}:00` : 'N/A';
    
    const mostActiveDay = Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0];
    const mostActiveDayName = mostActiveDay ? mostActiveDay[0] : 'N/A';
    
    const averageSession = totalSessions > 0 ? (totalSessionTime / totalSessions).toFixed(1) : 0;
    const reportsPerSession = totalReports > 0 ? (totalReports / Math.max(1, totalSessions)).toFixed(1) : 0;

    return {
      totalReports,
      changePercentage,
      changeType,
      changeSign,
      averageGenerationTime,
      successRate,
      errorRate,
      reportsPerDay,
      topTemplates,
      peakUsageTime,
      mostActiveDayName,
      averageSession,
      reportsPerSession,
    };
  }, [debouncedTimeRange, reports, analyticsData?.total_reports, analyticsData?.change_percentage, analyticsData?.average_generation_time, analyticsData?.success_rate, analyticsData?.error_rate, analyticsData?.popular_templates, analyticsData?.usage_trends, error]);

  // Debounce time range changes to prevent rapid API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTimeRange(timeRange);
    }, 500); // 500ms delay for stability

    return () => {
      clearTimeout(timer);
    };
  }, [timeRange]);

  // Load analytics data from API when debounced time range changes
  useEffect(() => {
    // Skip if already loading
    if (loading) {
      return;
    }
    
    let isMounted = true;
    
    const fetchAnalytics = async () => {
      if (!isMounted) {
        return;
      }
      
      // Prevent duplicate API calls
      if (currentApiCallRef.current === debouncedTimeRange) {
        return;
      }
      
      // Additional check: if we're already making a call for this time range, skip
      if (currentApiCallRef.current && currentApiCallRef.current !== debouncedTimeRange) {
        return;
      }
      
      // Only make API call if we already have data for this exact time range
      if (analyticsData && analyticsData.time_range === debouncedTimeRange) {
        return;
      }
      
      // Clear old data when time range changes to prevent showing stale data
      if (analyticsData && analyticsData.time_range !== debouncedTimeRange) {
        setAnalyticsData(null);
      }
      
      // Prevent API call if we're already loading
      if (loading) {
        return;
      }
      
      currentApiCallRef.current = debouncedTimeRange;
      setLoading(true);
      setError(null);
      
      try {
        const apiAnalytics = await loadAnalytics(debouncedTimeRange);
        
        if (isMounted && currentApiCallRef.current === debouncedTimeRange) {
          setAnalyticsData(apiAnalytics);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('API call failed:', error);
        if (isMounted && currentApiCallRef.current === debouncedTimeRange) {
          setError('Failed to load analytics from server. Showing local data instead.');
        }
        setLoading(false);
      } finally {
        if (isMounted && currentApiCallRef.current === debouncedTimeRange) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [debouncedTimeRange, loadAnalytics]);

  // Cleanup effect to prevent stale API calls
  useEffect(() => {
    return () => {
      currentApiCallRef.current = null;
    };
  }, []);

  const stats = [
    {
      name: 'Total Reports',
      value: calculateAnalytics.totalReports,
      change: `${calculateAnalytics.changeSign}${calculateAnalytics.changePercentage}%`,
      changeType: calculateAnalytics.changeType,
      icon: DocumentTextIcon,
    },
    {
      name: 'This Period',
      value: calculateAnalytics.totalReports,
      change: `${calculateAnalytics.changeSign}${calculateAnalytics.changePercentage}%`,
      changeType: calculateAnalytics.changeType,
      icon: ArrowTrendingUpIcon,
    },
    {
      name: 'Avg. Generation Time',
      value: `${(calculateAnalytics.averageGenerationTime / 60).toFixed(1)} min`,
      change: (calculateAnalytics.averageGenerationTime / 60) < 2.5 ? '-15%' : '+5%',
      changeType: (calculateAnalytics.averageGenerationTime / 60) < 2.5 ? 'positive' : 'negative',
      icon: ClockIcon,
    },
    {
      name: 'Success Rate',
      value: `${calculateAnalytics.successRate}%`,
      change: calculateAnalytics.successRate > 95 ? '+2.1%' : '-1.5%',
      changeType: calculateAnalytics.successRate > 95 ? 'positive' : 'negative',
      icon: ChartBarIcon,
    },
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
  ];

  const getTimeRangeLabel = () => {
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    return option ? option.label : 'Last 30 days';
  };



  if (loading && !loadingTimeout) {
    return (
      <div className="p-6 flex items-center justify-center min-h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your research performance and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          {loading && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Updating...</span>
            </div>
          )}
          {timeRange !== debouncedTimeRange && !loading && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Updating...</span>
            </div>
          )}
          <button
            onClick={() => {
              refreshReports().catch(error => {
                console.error('Failed to refresh reports:', error);
              });
            }}
            disabled={loading}
            className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Data Source Indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {analyticsData && analyticsData.time_range === debouncedTimeRange ? (
            <span className="text-green-600 dark:text-green-400">✓ Using live data from server</span>
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">⚠ Using local data (API unavailable)</span>
          )}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${
                stat.changeType === 'positive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">from previous period</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reports Generated</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTimeRangeLabel()}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Reports</span>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between space-x-1 overflow-x-auto">
            {chartData.length > 0 ? (
              chartData.map((data, index) => (
                <div key={index} className="flex-1 min-w-0 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 cursor-pointer relative group"
                    style={{ 
                      height: `${Math.max(2, (data.reports / Math.max(1, Math.max(...chartData.map(d => d.reports)))) * 100)}%`,
                      minHeight: '4px'
                    }}
                    title={`${data.reports} reports on ${data.date}`}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {data.reports} reports
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center leading-tight truncate w-full">
                    {data.date}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No data available for this time period</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {chartData.length} data points • Total: {calculateAnalytics.totalReports} reports
            {analyticsData && analyticsData.time_range === debouncedTimeRange ? (
              <span className="ml-2 text-green-600 dark:text-green-400">• Live data</span>
            ) : (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">• Local data</span>
            )}
          </div>
        </div>

        {/* Template Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Template Usage</h2>
          <div className="space-y-4">
            {calculateAnalytics.topTemplates.length > 0 ? (
              calculateAnalytics.topTemplates.map(([template, count], index) => (
                <div key={template} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="font-medium text-gray-900 dark:text-white">{template}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(count / Math.max(...calculateAnalytics.topTemplates.map(([,c]) => c))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No template usage data available for this period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Generation Time</span>
              <span className="font-medium text-gray-900 dark:text-white">{(calculateAnalytics.averageGenerationTime / 60).toFixed(1)} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.successRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.errorRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reports per Day</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.reportsPerDay}</span>
            </div>
          </div>
        </div>

        {/* Usage Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Trends</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Peak Usage Time</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.peakUsageTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Most Active Day</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.mostActiveDayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Session</span>
              <span className="font-medium text-gray-900 dark:text-white">{(calculateAnalytics.averageSession / 60).toFixed(1)} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reports per Session</span>
              <span className="font-medium text-gray-900 dark:text-white">{calculateAnalytics.reportsPerSession}</span>
            </div>
          </div>
        </div>

        {/* Plan Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan Usage</h2>
          {profileLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading usage data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Reports Used</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {userProfile?.usage?.reports_generated || 0}/{userProfile?.usage?.total_limit || 100}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${userProfile?.usage?.reports_generated && userProfile?.usage?.total_limit 
                        ? (userProfile.usage.reports_generated / userProfile.usage.total_limit) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Plan: <span className="font-medium text-gray-900 dark:text-white">
                  {userProfile?.plan?.toUpperCase() || 'FREE'}
                </span></p>
                <p className="mt-1">
                  {userProfile?.usage?.reports_remaining || 0} reports remaining
                </p>
              </div>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Upgrade Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
