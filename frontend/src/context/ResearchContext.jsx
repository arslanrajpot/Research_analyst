import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { researchAPI, apiUtils } from '../services/api';

const ResearchContext = createContext();

const initialState = {
  reports: [],
  currentReport: null,
  loading: false,
  error: null,
  analytics: {
    totalReports: 0,
    totalQueries: 0,
    averageGenerationTime: 0,
    popularTopics: [],
  },
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'pro',
    usage: {
      reportsGenerated: 45,
      reportsRemaining: 55,
    },
  },
};

const researchReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports],
        currentReport: action.payload,
        loading: false,
      };
    
    case 'SET_CURRENT_REPORT':
      return { ...state, currentReport: action.payload };
    
    case 'UPDATE_REPORT':
      return {
        ...state,
        reports: state.reports.map(report =>
          report.id === action.payload.id ? action.payload : report
        ),
        currentReport: state.currentReport?.id === action.payload.id ? action.payload : state.currentReport,
      };
    
    case 'DELETE_REPORT':
      return {
        ...state,
        reports: state.reports.filter(report => report.id !== action.payload),
        currentReport: state.currentReport?.id === action.payload ? null : state.currentReport,
      };
    
    case 'CLEAR_REPORTS':
      return {
        ...state,
        reports: [],
        currentReport: null,
      };
    

    
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload };
    
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    
    default:
      return state;
  }
};

export const ResearchProvider = ({ children }) => {
  const [state, dispatch] = useReducer(researchReducer, initialState);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load reports from API first
        try {
          const reportsResponse = await researchAPI.getReports();
          
          // Clear existing reports and add API reports
          dispatch({ type: 'CLEAR_REPORTS' });
          reportsResponse.reports.forEach(report => {
            dispatch({ type: 'ADD_REPORT', payload: report });
          });
        } catch (error) {
          console.error('Failed to load reports from API, using localStorage fallback:', error);
          
          // Load reports from localStorage as fallback
          const savedReports = localStorage.getItem('marketResearchReports');
          if (savedReports) {
            try {
              const reports = JSON.parse(savedReports);
              reports.forEach(report => {
                dispatch({ type: 'ADD_REPORT', payload: report });
              });
            } catch (error) {
              console.error('Error loading saved reports:', error);
            }
          }
        }

        // Templates are now loaded directly in the Templates page
        // No need to load them here anymore

        // Try to load analytics from API
        try {
          const analyticsResponse = await researchAPI.getAnalytics('30d');
          dispatch({ type: 'SET_ANALYTICS', payload: analyticsResponse });
        } catch (error) {
          console.error('Failed to load analytics from API:', error);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Save reports to localStorage when they change
  useEffect(() => {
    localStorage.setItem('marketResearchReports', JSON.stringify(state.reports));
  }, [state.reports]);

  const generateReport = async (query, template = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await fetch(`${researchAPI.baseURL || 'http://localhost:8000'}/research/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ 
          query,
          template_id: template?.id,
          session_id: Date.now().toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `HTTP ${response.status}: Failed to generate report`;
        throw new Error(errorMessage);
      }

      let reportContent = '';
      const sessionId = Date.now().toString();

      // Handle streaming response with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - research generation took too long')), 300000); // 5 minutes
      });

      await Promise.race([
        apiUtils.handleStreamResponse(response, (data) => {
          if (data.report) {
            reportContent = data.report;
          }
          if (data.error) {
            throw new Error(data.error);
          }
        }),
        timeoutPromise
      ]);

      if (!reportContent) {
        throw new Error('No report content received from server');
      }

      const newReport = {
        id: sessionId,
        query,
        content: reportContent,
        template: template?.name || 'Custom',
        createdAt: new Date().toISOString(),
        status: 'completed',
        generationTime: Math.random() * 3 + 1, // Mock generation time
      };

      dispatch({ type: 'ADD_REPORT', payload: newReport });
      toast.success('Report generated successfully!');
      
      // Notify that user profile should be refreshed
      window.dispatchEvent(new CustomEvent('reportGenerated', { detail: newReport }));
      
      return newReport;
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = apiUtils.formatError(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(`Failed to generate report: ${errorMessage}`);
      throw error;
    }
  };

  const deleteReport = (reportId) => {
    dispatch({ type: 'DELETE_REPORT', payload: reportId });
    toast.success('Report deleted successfully!');
  };

  const updateReport = (report) => {
    dispatch({ type: 'UPDATE_REPORT', payload: report });
    toast.success('Report updated successfully!');
  };

  const loadAnalytics = useCallback(async (timeRange = '30d') => {
    try {
      const analyticsResponse = await researchAPI.getAnalytics(timeRange);
      dispatch({ type: 'SET_ANALYTICS', payload: analyticsResponse });
      return analyticsResponse;
    } catch (error) {
      console.error('Failed to load analytics:', error);
      throw error;
    }
  }, []);

  const refreshReports = useCallback(async () => {
    try {
      const reportsResponse = await researchAPI.getReports();
      
      dispatch({ type: 'CLEAR_REPORTS' });
      reportsResponse.reports.forEach(report => {
        dispatch({ type: 'ADD_REPORT', payload: report });
      });
      
      return reportsResponse.reports;
    } catch (error) {
      console.error('Failed to refresh reports:', error);
      throw error;
    }
  }, []);

  const value = {
    ...state,
    generateReport,
    deleteReport,
    updateReport,
    loadAnalytics,
    refreshReports,
    dispatch,
  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};
