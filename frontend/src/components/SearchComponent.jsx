import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  BookOpenIcon,
  HeartIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  BookmarkIcon,
  ChartBarIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { researchAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

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

const SearchComponent = ({ onSearchResult, className = "", initialQuery = "" }) => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [query, setQuery] = useState(initialQuery || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sources: ['web', 'social', 'news', 'reports'],
    dateRange: null,
    contentTypes: ['articles', 'reports', 'social_posts', 'news'],
    sentiment: 'all',
    maxResults: 50
  });
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchAnalytics, setSearchAnalytics] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Source icons mapping
  const sourceIcons = {
    web: GlobeAltIcon,
    social: ChatBubbleLeftRightIcon,
    news: NewspaperIcon,
    reports: BookOpenIcon,
    semantic_search: SparklesIcon
  };

  // Sentiment colors
  const sentimentColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  useEffect(() => {
    loadSavedSearches();
    loadSearchAnalytics();
  }, []);

  // Auto-perform search if initialQuery is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const loadSavedSearches = async () => {
    try {
      const response = await researchAPI.getSavedSearches();
      setSavedSearches(response);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const loadSearchAnalytics = async () => {
    try {
      const response = await researchAPI.getSearchAnalytics();
      setSearchAnalytics(response);
    } catch (error) {
      console.error('Error loading search analytics:', error);
    }
  };

  const getSearchSuggestions = async (partialQuery) => {
    if (!partialQuery || !partialQuery.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await researchAPI.getSearchSuggestions(partialQuery);
      setSuggestions(response);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  const handleQueryChange = (value) => {
    setQuery(value || "");
    setShowSuggestions(true);

    // Debounce suggestions
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      getSearchSuggestions(value);
    }, 300);
  };

  const performSearch = async (searchQuery = query, searchFilters = filters) => {
    if (!searchQuery || !searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    setShowSuggestions(false);

    try {
      // Use unified search for comprehensive results
      const response = await researchAPI.unifiedSearch({ 
        query: searchQuery, 
        ...searchFilters,
        content_types: ['reports', 'templates', 'saved_searches', 'articles', 'reports', 'social_posts', 'news']
      });
      setSearchResults(response);
      if (onSearchResult) {
        onSearchResult(response);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const performSemanticSearch = async () => {
    if (!query || !query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    setShowSuggestions(false);

    try {
      const response = await researchAPI.semanticSearch({ query: query, max_results: filters.maxResults });
      setSearchResults(response);
      if (onSearchResult) {
        onSearchResult(response);
      }
    } catch (error) {
      console.error('Error performing semantic search:', error);
      toast.error('Semantic search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = async () => {
    if (!query || !query.trim()) {
      toast.error('Please enter a search query to save');
      return;
    }

    try {
      const response = await researchAPI.saveSearch({
        name: `Search: ${query}`,
        query: query,
        filters: filters,
        description: `Search for: ${query}`
      });
      toast.success('Search saved successfully!');
      await loadSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search.');
    }
  };

  const exportResults = async (format = 'json') => {
    try {
      const response = await researchAPI.exportSearchResults({ query: query, ...filters }, format);
      
      if (format === 'csv') {
        // Download CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `search_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download JSON file
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search_results_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success(`Results exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error('Failed to export results.');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleSavedSearchClick = (savedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters || filters);
    performSearch(savedSearch.query, savedSearch.filters || filters);
    setShowSavedSearches(false);
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'article':
        return DocumentTextIcon;
      case 'report':
        return BookOpenIcon;
      case 'social_post':
        return ChatBubbleLeftRightIcon;
      case 'news':
        return NewspaperIcon;
      default:
        return DocumentTextIcon;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for market insights, trends, competitors..."
              value={query || ""}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            {query && query.trim() && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all duration-200 ${
              showFilters 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            className="p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200"
          >
            <BookmarkIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => performSearch()}
            disabled={loading || !query || !query.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
          
          <button
            onClick={performSemanticSearch}
            disabled={loading || !query || !query.trim()}
            className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            title="Semantic Search"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search Suggestions */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Searches */}
        <AnimatePresence>
          {showSavedSearches && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Saved Searches</h3>
              </div>
              {savedSearches.length > 0 ? (
                savedSearches.map((savedSearch) => (
                  <button
                    key={savedSearch.id}
                    onClick={() => handleSavedSearchClick(savedSearch)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{savedSearch.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{savedSearch.query}</div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(savedSearch.saved_at)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No saved searches yet
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Search Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sources</label>
                <div className="space-y-2">
                  {[
                    { key: 'web', label: 'Web', icon: GlobeAltIcon },
                    { key: 'social', label: 'Social Media', icon: ChatBubbleLeftRightIcon },
                    { key: 'news', label: 'News', icon: NewspaperIcon },
                    { key: 'reports', label: 'Reports', icon: BookOpenIcon }
                  ].map((source) => {
                    const Icon = source.icon;
                    return (
                      <label key={source.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.sources.includes(source.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                sources: [...prev.sources, source.key]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                sources: prev.sources.filter(s => s !== source.key)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                        />
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{source.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                <div className="space-y-2">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'Past Week' },
                    { key: 'month', label: 'Past Month' },
                    { key: 'quarter', label: 'Past Quarter' },
                    { key: 'year', label: 'Past Year' }
                  ].map((range) => (
                    <label key={range.key} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="dateRange"
                        checked={filters.dateRange === range.key}
                        onChange={() => setFilters(prev => ({ ...prev, dateRange: range.key }))}
                        className="border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sentiment</label>
                <select
                  value={filters.sentiment}
                  onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              {/* Max Results */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Results</label>
                <select
                  value={filters.maxResults}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value={10}>10 results</option>
                  <option value={25}>25 results</option>
                  <option value={50}>50 results</option>
                  <option value={100}>100 results</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      {searchResults && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 max-h-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Search Results ({searchResults.total_results})
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Query: "{searchResults.query}"
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={saveSearch}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Save Search"
              >
                <BookmarkIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => exportResults('json')}
                className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                title="Export JSON"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => exportResults('csv')}
                className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                title="Export CSV"
              >
                <DocumentTextIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* External Results */}
          {searchResults.external_results && !searchResults.external_results.error && (
            <div className="mb-6 overflow-visible">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <GlobeAltIcon className="w-5 h-5 mr-2 text-blue-600" />
                Web & Social Media Results ({searchResults.external_results.total_results || 0})
              </h4>
              <div className="space-y-4">
                {searchResults.external_results.aggregated_results?.slice(0, 5).map((result, index) => {
                  const SourceIcon = sourceIcons[result.source] || DocumentTextIcon;
                  return (
                                    <div key={`external-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <SourceIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{result.source}</span>
                        {result.sentiment && (
                          <span className={`px-2 py-1 text-xs rounded-full ${sentimentColors[result.sentiment]}`}>
                            {result.sentiment}
                          </span>
                        )}
                      </div>
                      
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mb-2 block"
                        >
                          {result.title || result.url}
                        </a>
                      )}
                      
                      {result.snippet && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{result.snippet}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        {result.posted_at && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(result.posted_at), { addSuffix: true })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Internal Results */}
          {searchResults.internal_results && !searchResults.internal_results.error && (
            <div className="mb-6 overflow-visible">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                <BookOpenIcon className="w-5 h-5 mr-2 text-green-600" />
                Your Content ({searchResults.internal_results.total_results || 0})
              </h4>
              <div className="space-y-4">
                {searchResults.internal_results.aggregated_results?.slice(0, 5).map((result, index) => {
                  const ContentIcon = getContentIcon(result.type);
                  return (
                                    <div key={`internal-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <ContentIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{result.type.replace('_', ' ')}</span>
                        {result.template && (
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                            {result.template}
                          </span>
                        )}
                      </div>
                      
                      <a
                        href={result.url}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mb-2 block"
                      >
                        {result.title}
                      </a>
                      
                      {result.content && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{result.content}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        {result.created_at && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatDate(result.created_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Semantic Search Results */}
          {searchResults.search_type === 'semantic' && searchResults.results && (
            <div className="mb-6 overflow-visible">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                Semantic Search Results ({searchResults.total_results || 0})
              </h4>
              <div className="space-y-4">
                {searchResults.results?.map((result, index) => (
                  <div key={`semantic-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <SparklesIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Semantic Match</span>
                          {result.relevance_score && (
                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                              Score: {result.relevance_score.toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        {result.content && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{result.content}</p>
                        )}
                        
                        {result.metadata && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            {result.metadata.topic && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                                {result.metadata.topic}
                              </span>
                            )}
                            {result.metadata.date && (
                              <span>{result.metadata.date}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Results (for backward compatibility) */}
          {searchResults.aggregated_results && !searchResults.external_results && !searchResults.internal_results && searchResults.search_type !== 'semantic' && (
            <div className="space-y-4 overflow-visible">
              {searchResults.aggregated_results?.map((result, index) => {
                const SourceIcon = sourceIcons[result.source] || DocumentTextIcon;
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <SourceIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500 capitalize">{result.source}</span>
                          {result.sentiment && (
                            <span className={`px-2 py-1 text-xs rounded-full ${sentimentColors[result.sentiment]}`}>
                              {result.sentiment}
                            </span>
                          )}
                          {result.faves && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <HeartIcon className="w-4 h-4" />
                              <span>{result.faves}</span>
                            </div>
                          )}
                        </div>
                        
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium mb-2 block"
                          >
                            {result.title || result.url}
                          </a>
                        )}
                        
                        {result.snippet && (
                          <p className="text-gray-700 text-sm mb-2">{result.snippet}</p>
                        )}
                        
                        {result.content && (
                          <p className="text-gray-700 text-sm mb-2">{result.content}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {result.posted_at && (
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatDate(result.posted_at)}</span>
                            </div>
                          )}
                          {result.search_timestamp && (
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>Found {formatDate(result.search_timestamp)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search Analytics */}
      {searchAnalytics && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Search Analytics</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{searchAnalytics.total_searches}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Searches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{searchAnalytics.period_days}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Days Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{searchAnalytics.top_queries?.length || 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Unique Queries</div>
            </div>
          </div>
          
          {searchAnalytics.top_queries && searchAnalytics.top_queries.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Top Searches</h4>
              <div className="space-y-2">
                {searchAnalytics.top_queries.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{item.query}</span>
                    <span className="text-gray-500 dark:text-gray-400">{item.count} searches</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
