import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { researchAPI } from '../services/api';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  ArrowRightIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useResearch } from '../context/ResearchContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

// Helper function to safely format dates
const formatDate = (dateString) => {
  try {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Invalid date';
  }
};

const Dashboard = () => {
  const { analytics } = useResearch();
  const { user, loading: authLoading, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Prefer a friendly display name from available sources
  const getUserDisplayName = (primary, secondary) => {
    const pick = (u) =>
      u?.name || u?.full_name || u?.fullName || u?.username || (u?.email ? u.email.split('@')[0] : undefined);
    return pick(primary) || pick(secondary) || 'User';
  };

  // Debug authentication state
  useEffect(() => {
    console.log('🔍 Dashboard Debug:');
    console.log('User:', user);
    console.log('Auth Loading:', authLoading);
    console.log('Is Authenticated:', !!user);
    console.log('Current URL:', window.location.href);
    
    // Check localStorage
    const authToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Auth Token in localStorage:', authToken ? 'Present' : 'Missing');
    console.log('Refresh Token in localStorage:', refreshToken ? 'Present' : 'Missing');
  }, [user, authLoading]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setTemplatesLoading(true);
        setProfileLoading(true);
        
        const [reportsResponse, templatesResponse, profileResponse] = await Promise.all([
          researchAPI.getReports(),
          researchAPI.getTemplates(),
          researchAPI.getUserProfile().catch(error => {
            console.warn('Failed to load user profile:', error);
            return null;
          })
        ]);
        
        // Ensure we have arrays
        const reportsArray = Array.isArray(reportsResponse) ? reportsResponse : [];
        const templatesArray = Array.isArray(templatesResponse) ? templatesResponse : [];
        
        console.log('Dashboard data loaded:', { 
          reports: reportsArray.length, 
          templates: templatesArray.length,
          profile: profileResponse ? 'Loaded' : 'Failed'
        });
        
        setReports(reportsArray);
        setTemplates(templatesArray);
        setUserProfile(profileResponse);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
        // Set empty arrays on error
        setReports([]);
        setTemplates([]);
        setUserProfile(null);
      } finally {
        setLoading(false);
        setTemplatesLoading(false);
        setProfileLoading(false);
      }
    };

    loadData();
  }, []);

  // Listen for report generation events to refresh user profile
  useEffect(() => {
    const handleReportGenerated = () => {
      console.log('Report generated, refreshing user profile...');
      refreshUserProfile();
    };

    window.addEventListener('reportGenerated', handleReportGenerated);
    return () => {
      window.removeEventListener('reportGenerated', handleReportGenerated);
    };
  }, []);

  // Compute average generation time (seconds -> minutes) for stats card
  const averageGenerationTimeSec = Array.isArray(reports) && reports.length > 0
    ? reports.reduce((sum, r) => sum + (r.generationTime || 0), 0) / reports.length
    : 0;
  const averageGenerationTimeMin = (averageGenerationTimeSec / 60).toFixed(1);

  const stats = [
    {
      name: 'Total Reports',
      value: reports?.length || 0,
      change: '+12%',
      changeType: 'positive',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'This Month',
      value: reports?.filter(r => {
        const reportDate = new Date(r.createdAt);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length || 0,
      change: '+8%',
      changeType: 'positive',
      icon: ArrowTrendingUpIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Avg. Generation Time',
      value: `${averageGenerationTimeMin} min`,
      change: '-15%',
      changeType: 'positive',
      icon: ClockIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Success Rate',
      value: '98.5%',
      change: '+2.1%',
      changeType: 'positive',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
    },
  ];

  const handleCopyReport = async (report) => {
    try {
      const reportText = `# ${report.query}\n\n${report.content}`;
      await navigator.clipboard.writeText(reportText);
      toast.success('Report copied to clipboard!');
    } catch (error) {
      console.error('Error copying report:', error);
      toast.error('Failed to copy report to clipboard');
    }
  };

  const handleUseTemplate = () => {
    setShowTemplateModal(true);
  };

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    try {
      setProfileLoading(true);
      const profileResponse = await researchAPI.getUserProfile();
      setUserProfile(profileResponse);
      console.log('User profile refreshed:', profileResponse);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    console.log('🔍 Template Selection Debug:');
    console.log('Template:', template);
    console.log('User:', user);
    console.log('Is Authenticated:', !!user);
    
    // Close the modal first
    setShowTemplateModal(false);
    
    // Check if user is authenticated
    if (!user) {
      console.log('❌ User not authenticated, showing error');
      toast.error('Please log in to use templates');
      return;
    }
    
    console.log('✅ User authenticated, navigating to:', `/research?template=${template.id}`);
    
    // Navigate to research page with template pre-selected
    // Use React Router navigation for better UX
    navigate(`/research?template=${template.id}`);
  };

  const handleDemoLogin = async () => {
    try {
      await demoLogin();
    } catch (error) {
      console.error('Demo login error:', error);
      // Error is already handled in the demoLogin function
    }
  };

  const handleViewReport = (report) => {
    // Open report in new tab
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <html>
          <head>
            <title>${report.query}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.7; 
                color: #1f2937; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
              }
              
              .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
              }
              
              .header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 10px;
                line-height: 1.2;
              }
              
              .header .subtitle {
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
              }
              
              .metadata {
                background: #f8fafc;
                padding: 30px 40px;
                border-bottom: 1px solid #e2e8f0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
              }
              
              .metadata-item {
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .metadata-icon {
                width: 20px;
                height: 20px;
                background: #667eea;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
              }
              
              .metadata-label {
                font-weight: 600;
                color: #64748b;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .metadata-value {
                color: #1f2937;
                font-weight: 500;
              }
              
              .content {
                padding: 40px;
                font-size: 1.1rem;
              }
              
              .content h2 {
                color: #1f2937;
                font-size: 1.8rem;
                font-weight: 700;
                margin: 40px 0 20px 0;
                padding-bottom: 10px;
                border-bottom: 3px solid #667eea;
                position: relative;
              }
              
              .content h2:first-child {
                margin-top: 0;
              }
              
              .content h3 {
                color: #374151;
                font-size: 1.4rem;
                font-weight: 600;
                margin: 30px 0 15px 0;
              }
              
              .content h4 {
                color: #4b5563;
                font-size: 1.2rem;
                font-weight: 600;
                margin: 25px 0 10px 0;
              }
              
              .content p {
                margin-bottom: 20px;
                color: #4b5563;
              }
              
              .content ul, .content ol {
                margin: 20px 0;
                padding-left: 30px;
              }
              
              .content li {
                margin-bottom: 10px;
                color: #4b5563;
              }
              
              .content strong {
                color: #1f2937;
                font-weight: 600;
              }
              
              .content em {
                color: #6b7280;
                font-style: italic;
              }
              
              .highlight-box {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 25px 0;
                border-radius: 8px;
              }
              
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
              }
              
              .stat-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 25px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                transition: transform 0.2s ease;
              }
              
              .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 15px rgba(0,0,0,0.1);
              }
              
              .stat-number {
                font-size: 2.5rem;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 10px;
              }
              
              .stat-label {
                color: #6b7280;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-size: 0.9rem;
              }
              
              .footer {
                background: #f8fafc;
                padding: 30px 40px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 0.9rem;
              }
              
              .footer .logo {
                font-weight: 700;
                color: #667eea;
                font-size: 1.1rem;
              }
              
              @media (max-width: 768px) {
                body { padding: 10px; }
                .header { padding: 30px 20px; }
                .header h1 { font-size: 2rem; }
                .metadata { padding: 20px; grid-template-columns: 1fr; }
                .content { padding: 20px; }
                .stats-grid { grid-template-columns: 1fr; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${report.query}</h1>
                <div class="subtitle">Market Research Report</div>
              </div>
              
              <div class="metadata">
                <div class="metadata-item">
                  <div class="metadata-icon">📅</div>
                  <div>
                    <div class="metadata-label">Generated</div>
                    <div class="metadata-value">${formatDate(report.createdAt)}</div>
                  </div>
                </div>
                <div class="metadata-item">
                  <div class="metadata-icon">📋</div>
                  <div>
                    <div class="metadata-label">Template</div>
                    <div class="metadata-value">${report.template}</div>
                  </div>
                </div>
              </div>
              
              <div class="content">
                ${report.content.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                              .replace(/\\*([^*]+)\\*/g, '<em>$1</em>')
                              .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                              .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                              .replace(/^# (.*$)/gim, '<h2>$1</h2>')
                              .replace(/^\\* (.*$)/gim, '<li>$1</li>')
                              .replace(/^\\d+\\. (.*$)/gim, '<li>$1</li>')
                              .replace(/<li>/g, '<ul><li>')
                              .replace(/<\/li>/g, '</li></ul>')}
              </div>
              
              <div class="footer">
                <div class="logo">Market Research Pro</div>
                <div>AI-Powered Market Intelligence Platform</div>
              </div>
            </div>
          </body>
        </html>
      `);
      reportWindow.document.close();
    }
  };

  // Calculate derived data
  const recentReports = Array.isArray(reports) ? reports.slice(0, 5) : [];
  const popularTemplates = Array.isArray(templates) ? templates.slice(0, 4) : [];

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                              <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {authLoading ? (
                    'Loading...'
                  ) : user ? (
                    `Welcome back, ${getUserDisplayName(user, userProfile)}! Here's what's happening with your research.`
                  ) : (
                    'Please log in to access all features and templates.'
                  )}
                </p>
            </div>
            <div className="flex items-center space-x-3">
              {!user && (
                <button
                  onClick={handleDemoLogin}
                  disabled={authLoading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
                >
                  {authLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Logging in...
                    </>
                  ) : (
                    'Demo Login'
                  )}
                </button>
              )}
              <Link
                to="/research"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Research
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Reports */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Reports</h2>
                  <Link
                    to="/reports"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    View all
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {recentReports.length > 0 ? (
                  <div className="space-y-4">
                    {recentReports.map((report, index) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{report.query}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(report.createdAt)} • {report.template}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button 
                            onClick={() => handleViewReport(report)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="View in new tab"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleCopyReport(report)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                            title="Copy to clipboard"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
                    <p className="text-gray-500 mb-6">Start your first market research to see it here.</p>
                    <Link
                      to="/research"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Report
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/research"
                  className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900 dark:text-white">New Research</span>
                </Link>
                <button
                  onClick={() => handleUseTemplate()}
                  className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full"
                >
                  <DocumentDuplicateIcon className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900 dark:text-white">Use Template</span>
                </button>
                <Link
                  to="/analytics"
                  className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="font-medium text-gray-900 dark:text-white">View Analytics</span>
                </Link>
              </div>
            </div>

            {/* Popular Templates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Templates</h2>
              <div className="space-y-3">
                {popularTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                  >
                    <span className="text-2xl mr-3">{template.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                      {template.rating > 0 && (
                        <div className="flex items-center mt-1">
                          <StarIcon className="w-3 h-3 text-yellow-500 mr-1" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {template.rating} ({template.rating_count} ratings)
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage</h2>
                <button
                  onClick={refreshUserProfile}
                  disabled={profileLoading}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                  title="Refresh usage data"
                >
                  <svg className={`w-4 h-4 ${profileLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {profileLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading usage data...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Reports Generated</span>
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
                      {userProfile?.usage?.reports_remaining || 0} reports remaining this month
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTemplateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Choose a Template</h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Select a template to start your research with pre-defined prompts and structure
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                          {template.icon || '📄'}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {template.description}
                          </p>
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {template.estimated_time || '2-3 min'}
                            </span>
                            <span className="flex items-center">
                              <TagIcon className="w-3 h-3 mr-1" />
                              {template.category}
                            </span>
                            {template.rating > 0 && (
                              <span className="flex items-center">
                                <StarIcon className="w-3 h-3 mr-1 text-yellow-500" />
                                {template.rating} ({template.rating_count})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <Link
                  to="/templates"
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View All Templates
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
