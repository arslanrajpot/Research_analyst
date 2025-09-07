import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useResearch } from '../context/ResearchContext';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import DocumentImport from '../components/DocumentImport';
import ResearchLoadingOverlay from '../components/ResearchLoadingOverlay';
import { researchAPI } from '../services/api';

const ResearchGenerator = () => {
  console.log('🚀 ResearchGenerator Component Starting...');

  // Hooks at the top level
  const { generateReport, loading, error, currentReport } = useResearch();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState({
    includeCompetitors: true,
    includeMarketSize: true,
    includeTrends: true,
    includeForecasts: true,
    depth: 'comprehensive',
  });
  const [generatedReports, setGeneratedReports] = useState([]);
  const [showDocumentImport, setShowDocumentImport] = useState(false);
  const [importedDocuments, setImportedDocuments] = useState([]);
  const [showResearchLoading, setShowResearchLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const renderCount = useRef(0); // Track renders
  const hasLoadedTemplates = useRef(false); // Prevent duplicate API calls
  const hasShownToast = useRef(false); // Prevent duplicate toasts

  // Increment render count
  renderCount.current += 1;
  console.log(`🔍 Render count: ${renderCount.current}`);

  // Debug component loading
  console.log('🔍 ResearchGenerator Component Loaded');
  console.log('Search Params:', searchParams.toString());
  console.log('Template ID from URL:', searchParams.get('template'));
  console.log('Current URL:', window.location.href);
  console.log('Research Context State:', { loading, error, currentReport });
  console.log('Auth State:', { user, authLoading, isAuthenticated });
  console.log('🔍 ResearchGenerator Loading...', { authLoading, templatesLoading });

  // Memoized loadTemplates to prevent redefinition
  const loadTemplates = useCallback(async () => {
    if (hasLoadedTemplates.current) {
      console.log('🔍 Skipping loadTemplates: already loaded');
      return;
    }

    console.log('🔍 loadTemplates called at:', new Date().toISOString());
    console.log('🔍 loadTemplates auth state:', {
      isAuthenticated,
      user: user ? 'Present (object)' : 'Missing (falsy)',
    });

    try {
      console.log('🔍 Setting templatesLoading to true');
      setTemplatesLoading(true);
      console.log('🔍 Making API call: researchAPI.getTemplates()');

      const response = await researchAPI.getTemplates();
      console.log('✅ Templates loaded successfully:', response);
      setTemplates(Array.isArray(response) ? response : []);
      hasLoadedTemplates.current = true;
    } catch (error) {
      console.error('❌ Failed to load templates:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setTemplates([]);
      toast.error(`Failed to load templates: ${error.message}`);
    } finally {
      console.log('🔍 Finally block: setting templatesLoading to false');
      setTemplatesLoading(false);
    }
  }, [isAuthenticated, user?.id]); // Use user?.id for stability

  // useEffect for loading templates
  useEffect(() => {
    console.log('🔍 ResearchGenerator useEffect triggered at:', new Date().toISOString());
    console.log('🔍 Dependency values:', {
      authLoading,
      isAuthenticated,
      userId: user?.id,
      userDetails: JSON.stringify(user, null, 2),
    });
    console.log('🔍 AuthContext values:', {
      authLoading,
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email,
    });

    if (authLoading) {
      console.log('🔍 Skipping loadTemplates because authLoading is true');
      return;
    }

    if (!isAuthenticated || !user) {
      console.log('🔍 Skipping loadTemplates: not authenticated or no user');
      setTemplates([]);
      setTemplatesLoading(false);
      return;
    }

    console.log('🔍 Calling loadTemplates');
    loadTemplates();

    // Fallback timeout
    const fallbackTimeout = setTimeout(() => {
      if (!hasLoadedTemplates.current) {
        console.log('🔍 Fallback timeout triggered: forcing templatesLoading false');
        setTemplatesLoading(false);
        setTemplates([]);
        toast.error('Template loading timed out. Please try again.');
      } else {
        console.log('🔍 Fallback timeout skipped: templates already loaded');
      }
    }, 15000); // Increased to 15s to give more time for API

    return () => {
      console.log('🔍 useEffect cleanup');
      clearTimeout(fallbackTimeout);
    };
  }, [authLoading, isAuthenticated, user?.id, loadTemplates]);

  // Load template from URL params (without toast)
  useEffect(() => {
    const templateId = searchParams.get('template');
    console.log('🔍 Template Loading Debug:');
    console.log('Template ID from URL:', templateId);
    console.log('Templates loaded:', templates.length);
    console.log('Templates loading:', templatesLoading);

    if (templateId) {
      try {
        if (templates.length > 0) {
          // Templates are already loaded
          const template = templates.find(t => t.id === parseInt(templateId));
          console.log('Found template:', template);
          if (template) {
            setSelectedTemplate(template);
            setQuery(template.prompts[0] || '');
          } else {
            console.error(`Template with ID ${templateId} not found in loaded templates`);
            toast.error(`Template with ID ${templateId} not found`);
          }
        } else if (!templatesLoading) {
          // Templates failed to load, try to fetch the specific template
          const fetchTemplate = async () => {
            try {
              console.log('🔍 Fetching specific template:', templateId);
              console.log('🔍 Auth token for template fetch:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
              const template = await researchAPI.getTemplate(parseInt(templateId));
              console.log('✅ Template fetched successfully:', template);
              setSelectedTemplate(template);
              setQuery(template.prompts[0] || '');
            } catch (error) {
              console.error('❌ Failed to load template:', error);
              console.error('❌ Template fetch error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
              });

              if (error.response?.status === 401) {
                toast.error('Authentication failed. Please log in again.');
              } else if (error.response?.status === 404) {
                toast.error(`Template with ID ${templateId} not found.`);
              } else {
                toast.error(`Failed to load template: ${error.message}`);
              }
            }
          };
          fetchTemplate();
        }
      } catch (error) {
        console.error('❌ Error in template loading logic:', error);
        toast.error('Error loading template. Please try again.');
      }
    }
  }, [searchParams, templates, templatesLoading]);

  // Separate useEffect for showing toast when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate && !hasShownToast.current) {
      toast.success(`Template "${selectedTemplate.name}" loaded successfully!`);
      hasShownToast.current = true;
    }
  }, [selectedTemplate]);

  // Early returns after hooks
  if (error) {
    console.error('ResearchGenerator Error:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Research Generator</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    console.log('❌ User not authenticated, redirecting to login');
    window.location.href = '/login';
    return null;
  }

  if (authLoading || templatesLoading) {
    console.log('🔍 ResearchGenerator Loading...', { authLoading, templatesLoading });
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Research Generator</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {authLoading ? 'Checking authentication...' : 'Please wait while we load your templates...'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setQuery(template.prompts[0] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      // Show research loading overlay
      setCurrentQuery(query);
      setShowResearchLoading(true);
      
      const report = await generateReport(query, selectedTemplate);
      setGeneratedReports(prev => [report, ...prev]);
      
      // Hide loading overlay after completion
      setShowResearchLoading(false);
    } catch (error) {
      console.error('Error generating report:', error);
      setShowResearchLoading(false);
      
      // Show error toast with more details
      toast.error(`Research generation failed: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setQuery(prompt);
  };

  const handleDocumentImportComplete = (documents) => {
    setImportedDocuments(prev => [...prev, ...documents]);
    toast.success(`${documents.length} document(s) added to research context`);
  };

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

  const handleViewReport = (report) => {
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
                    <div class="metadata-value">${new Date(report.createdAt).toLocaleString()}</div>
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
                ${report.content
                  .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
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

  const handleDeleteReport = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      setGeneratedReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Report deleted successfully!');
    }
  };

  const depthOptions = [
    { value: 'basic', label: 'Basic', description: 'Quick overview and key insights' },
    { value: 'standard', label: 'Standard', description: 'Balanced depth with main findings' },
    { value: 'comprehensive', label: 'Comprehensive', description: 'In-depth analysis with detailed insights' },
  ];

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Research Generator</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Generate comprehensive market research reports with AI</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Templates</h2>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{template.icon || '📄'}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTemplate && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Prompts</h2>
                <div className="space-y-2">
                  {selectedTemplate.prompts?.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="w-full text-left p-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Research Context</h2>
                <button
                  onClick={() => setShowDocumentImport(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <DocumentArrowUpIcon className="w-4 h-4" />
                  <span>Import Documents</span>
                </button>
              </div>
              {importedDocuments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {importedDocuments.length} document(s) will be included in analysis
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Import documents to provide additional context for your research
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Options</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Analysis Depth</label>
                <div className="space-y-3">
                  {depthOptions.map((option) => (
                    <label key={option.value} className="flex items-start">
                      <input
                        type="radio"
                        name="depth"
                        value={option.value}
                        checked={advancedOptions.depth === option.value}
                        onChange={(e) => setAdvancedOptions(prev => ({ ...prev, depth: e.target.value }))}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeCompetitors}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, includeCompetitors: e.target.checked }))}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include competitor analysis</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeMarketSize}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, includeMarketSize: e.target.checked }))}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include market size data</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeTrends}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, includeTrends: e.target.checked }))}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include market trends</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeForecasts}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, includeForecasts: e.target.checked }))}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include market forecasts</span>
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Research Query</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe your market research needs... (e.g., Analyze the competitive landscape for electric vehicles in Europe)"
                    className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <XCircleIcon className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-red-700 dark:text-red-400">{error}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {selectedTemplate && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {selectedTemplate.icon} {selectedTemplate.name}
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {query.length} characters
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            <div className="space-y-6">
              {generatedReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{report.query}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Generated {new Date(report.createdAt).toLocaleString()} • {report.template}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="View in new tab"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyReport(report)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Copy to clipboard"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete report"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="markdown-content text-gray-900 dark:text-gray-100">
                      <ReactMarkdown>{report.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Generating your report...</h3>
                      <p className="text-gray-500 dark:text-gray-400">This may take a few minutes. We're analyzing market data and generating insights.</p>
                    </div>
                  </div>
                </motion.div>
              )}
              {generatedReports.length === 0 && !loading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports generated yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Enter your research query above to generate your first market research report.</p>
                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      <span>2-3 minutes</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      <span>AI-powered insights</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showDocumentImport && (
        <DocumentImport
          onClose={() => setShowDocumentImport(false)}
          onImportComplete={handleDocumentImportComplete}
        />
      )}

      {/* Research Loading Overlay */}
      {showResearchLoading && (
        <ResearchLoadingOverlay
          isVisible={showResearchLoading}
          onClose={() => setShowResearchLoading(false)}
          query={currentQuery}
        />
      )}
    </div>
  );
};

export default ResearchGenerator;