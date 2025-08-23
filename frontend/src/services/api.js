import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔍 API Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing');
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('🔍 API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('🔍 API Error:', error.response?.status, error.config?.url, error.message);
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      console.log('❌ Authentication failed, redirecting to login');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Research API
export const researchAPI = {
  // Generate a new research report
  generateReport: async (query, templateId = null, sessionId = null) => {
    const response = await api.post('/research/generate', {
      query,
      template_id: templateId,
      session_id: sessionId,
    });
    return response.data;
  },

  // Get all templates
  getTemplates: async (params = {}) => {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  // Create template
  createTemplate: async (templateData) => {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  // Get template by ID
  getTemplate: async (templateId) => {
    const response = await api.get(`/templates/${templateId}`);
    return response.data;
  },

  // Update template
  updateTemplate: async (templateId, templateData) => {
    const response = await api.put(`/templates/${templateId}`, templateData);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (templateId) => {
    const response = await api.delete(`/templates/${templateId}`);
    return response.data;
  },

  // Duplicate template
  duplicateTemplate: async (templateId) => {
    const response = await api.post(`/templates/${templateId}/duplicate`);
    return response.data;
  },

  // Share template
  shareTemplate: async (templateId, shareData) => {
    const response = await api.post(`/templates/${templateId}/share`, shareData);
    return response.data;
  },

  // Get templates shared with me
  getTemplatesSharedWithMe: async () => {
    const response = await api.get('/templates/shared/with-me');
    return response.data;
  },

  // Get templates shared by me
  getTemplatesSharedByMe: async () => {
    const response = await api.get('/templates/shared/by-me');
    return response.data;
  },

  // Record template usage
  recordTemplateUsage: async (templateId, usageData = {}) => {
    const response = await api.post(`/templates/${templateId}/use`, usageData);
    return response.data;
  },

  // Get template usage history
  getTemplateUsage: async (templateId, limit = 50) => {
    const response = await api.get(`/templates/${templateId}/usage`, { params: { limit } });
    return response.data;
  },

  // Rate template
  rateTemplate: async (templateId, ratingData) => {
    const response = await api.post(`/templates/${templateId}/rate`, ratingData);
    return response.data;
  },

  // Get template ratings
  getTemplateRatings: async (templateId, limit = 50) => {
    const response = await api.get(`/templates/${templateId}/ratings`, { params: { limit } });
    return response.data;
  },

  // Get template analytics
  getTemplateAnalytics: async () => {
    const response = await api.get('/templates/analytics/overview');
    return response.data;
  },

  // Get template categories
  getTemplateCategories: async () => {
    const response = await api.get('/templates/categories');
    return response.data;
  },

  // Get featured templates
  getFeaturedTemplates: async (limit = 10) => {
    const response = await api.get('/templates/featured', { params: { limit } });
    return response.data;
  },

  // Import templates
  importTemplates: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/templates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Export templates
  exportTemplates: async (templateIds = null, format = 'json') => {
    const params = { format };
    if (templateIds) params.template_ids = templateIds.join(',');
    const response = await api.get('/templates/export', { params });
    return response.data;
  },

  // Get user's reports
  getReports: async (limit = 100, offset = 0, template = null) => {
    const params = { limit, offset };
    if (template) params.template = template;
    const response = await api.get('/research/reports', { params });
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.reports)) {
      return response.data.reports;
    } else {
      console.warn('Unexpected reports response format:', response.data);
      return [];
    }
  },

  // Delete a report
  deleteReport: async (reportId) => {
    const response = await api.delete(`/research/reports/${reportId}`);
    return response.data;
  },


  // Get analytics data
  getAnalytics: async (timeRange = '30d') => {
    const response = await api.get(`/research/analytics?time_range=${timeRange}`);
    return response.data;
  },

  // Get user profile
  getUserProfile: async () => {
    const response = await api.get('/research/user/profile');
    return response.data;
  },

  // Update user profile
  updateUserProfile: async (profileData) => {
    const response = await api.put('/research/user/profile', profileData);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/research/health');
    return response.data;
  },

  // Search functionality
  search: async (searchData) => {
    const response = await api.post('/research/search', searchData);
    return response.data;
  },

  // Internal search (reports, templates, saved searches)
  internalSearch: async (searchData) => {
    const response = await api.post('/research/search/internal', searchData);
    return response.data;
  },

  // Unified search (external + internal)
  unifiedSearch: async (searchData) => {
    const response = await api.post('/research/search/unified', searchData);
    return response.data;
  },

  // Semantic search
  semanticSearch: async (searchData) => {
    const response = await api.post('/research/search/semantic', searchData);
    return response.data;
  },

  // Get search suggestions
  getSearchSuggestions: async (partialQuery, context = 'market research') => {
    const response = await api.post('/research/search/suggestions', {
      partial_query: partialQuery,
      context: context
    });
    return response.data;
  },

  // Save search
  saveSearch: async (searchData) => {
    const response = await api.post('/research/search/save', searchData);
    return response.data;
  },

  // Get saved searches
  getSavedSearches: async () => {
    const response = await api.get('/research/search/saved');
    return response.data;
  },

  // Get search analytics
  getSearchAnalytics: async (days = 30) => {
    const response = await api.get(`/research/search/analytics?days=${days}`);
    return response.data;
  },

  // Export search results
  exportSearchResults: async (searchData, format = 'json') => {
    const response = await api.post(`/research/search/export?format=${format}`, searchData);
    return response.data;
  },

  // Notifications API
  getNotifications: async (limit = 50, unreadOnly = false) => {
    const params = { limit, unread_only: unreadOnly };
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getMessages: async (limit = 50, unreadOnly = false) => {
    const params = { limit, unread_only: unreadOnly };
    const response = await api.get('/notifications/messages', { params });
    return response.data;
  },

  getUnreadCounts: async () => {
    const response = await api.get('/notifications/unread-counts');
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markMessageRead: async (messageId) => {
    const response = await api.put(`/notifications/messages/${messageId}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  markAllMessagesRead: async () => {
    const response = await api.put('/notifications/messages/mark-all-read');
    return response.data;
  },

  // Generate sample data for testing
  generateSampleData: async (notificationsCount = 5, messagesCount = 3) => {
    const params = { notifications_count: notificationsCount, messages_count: messagesCount };
    const response = await api.post('/notifications/generate-sample-data', null, { params });
    return response.data;
  },

  // Trigger dynamic notifications
  triggerReportCompleted: async (reportId, templateName = "Market Analysis", generationTime = null) => {
    const response = await api.post('/notifications/trigger/report-completed', {
      report_id: reportId,
      template_id: reportId,
      template_name: templateName,
      generation_time: generationTime
    });
    return response.data;
  },

  triggerApiUsageCheck: async (currentUsage, limit = 1000) => {
    const response = await api.post('/notifications/trigger/api-usage-check', {
      current_usage: currentUsage,
      limit: limit
    });
    return response.data;
  },

  triggerFeatureRelease: async (featureName, featureDescription, featureUrl = "/features", planRequired = "pro") => {
    const response = await api.post('/notifications/trigger/feature-release', {
      feature_name: featureName,
      feature_description: featureDescription,
      feature_url: featureUrl,
      plan_required: planRequired
    });
    return response.data;
  },

  triggerWeeklyInsights: async (summaryData) => {
    const response = await api.post('/notifications/trigger/weekly-insights', summaryData);
    return response.data;
  }
};

// Auth API
export const authAPI = {
  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Demo login for testing
  demoLogin: async () => {
    const response = await api.post('/auth/demo-login');
    return response.data;
  },

  // Register user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData) => {
    const response = await api.put('/auth/me', userData);
    return response.data;
  },

  // Get user profile with usage stats
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Utility functions
export const apiUtils = {
  // Handle streaming responses
  handleStreamResponse: async (response, onChunk) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Format error messages
  formatError: (error) => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Check if server is reachable
  checkServerHealth: async () => {
    try {
      await researchAPI.healthCheck();
      return true;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  },
};

export default api;
