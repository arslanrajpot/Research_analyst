import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChartBarIcon,
  BookOpenIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { researchAPI } from '../../services/api';
import toast from 'react-hot-toast';
import NotificationsPanel from '../NotificationsPanel';
import MessagesPanel from '../MessagesPanel';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0 });
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Load unread counts
  useEffect(() => {
    if (user) {
      loadUnreadCounts();
    }
  }, [user]);

  const loadUnreadCounts = async () => {
    try {
      const counts = await researchAPI.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  // Save recent searches to localStorage
  const saveRecentSearch = (query) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Get search suggestions
  const getSearchSuggestions = async (query) => {
    if (!query || !query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const suggestions = await researchAPI.getSearchSuggestions(query);
      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  // Handle search query changes
  const handleSearchChange = (value) => {
    setSearchQuery(value || "");
    setShowSearchResults(true);
    setSelectedIndex(-1);

    // Debounce suggestions
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value && value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        getSearchSuggestions(value);
      }, 300);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Perform search
  const performSearch = async (query = searchQuery) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    try {
      // Save to recent searches
      saveRecentSearch(query);

      // Navigate to search page with query
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowSearchResults(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick search for suggestions (internal content only for speed)
  const quickSearch = async (query) => {
    if (!query || !query.trim()) return [];

    try {
      const results = await researchAPI.internalSearch({
        query: query,
        max_results: 3,
        content_types: ['reports', 'templates', 'saved_searches']
      });
      return results.aggregated_results || [];
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const totalItems = searchSuggestions.length + recentSearches.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < searchSuggestions.length) {
            performSearch(searchSuggestions[selectedIndex]);
          } else {
            const recentIndex = selectedIndex - searchSuggestions.length;
            performSearch(recentSearches[recentIndex]);
          }
        } else if (searchQuery && searchQuery.trim()) {
          performSearch();
        }
        break;
      case 'Escape':
        setShowSearchResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close search results and user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target)) {
        setShowSearchResults(false);
        setSelectedIndex(-1);
      }
      
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for content type
  const getContentIcon = (type) => {
    switch (type) {
      case 'report': return DocumentTextIcon;
      case 'template': return BookOpenIcon;
      case 'analytics': return ChartBarIcon;
      case 'insight': return SparklesIcon;
      default: return DocumentTextIcon;
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-lg relative" ref={searchResultsRef}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search reports, templates, or insights..."
              value={searchQuery || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchQuery && searchQuery.trim() && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchSuggestions([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showSearchResults && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
              >
                {/* Search Suggestions */}
                {searchSuggestions.length > 0 && (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Suggestions
                    </h3>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => performSearch(suggestion)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedIndex === index 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Recent Searches
                    </h3>
                    {recentSearches.map((search, index) => {
                      const suggestionIndex = searchSuggestions.length + index;
                      return (
                        <button
                          key={index}
                          onClick={() => performSearch(search)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedIndex === suggestionIndex 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{search}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Actions */}
                {searchQuery && searchQuery.trim() && (
                  <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => performSearch()}
                      disabled={loading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Searching...</span>
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="w-4 h-4" />
                          <span className="text-sm">Search for "{searchQuery}"</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* No Results */}
                {(!searchQuery || !searchQuery.trim()) && searchSuggestions.length === 0 && recentSearches.length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Start typing to search</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4 ml-6">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <SunIcon className="w-6 h-6" />
            ) : (
              <MoonIcon className="w-6 h-6" />
            )}
          </button>
          
          {/* Notifications */}
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowMessages(false);
            }}
            className="relative p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <BellIcon className="w-6 h-6" />
            {unreadCounts.notifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Messages */}
          <button 
            onClick={() => {
              setShowMessages(!showMessages);
              setShowNotifications(false);
            }}
            className="relative p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <EnvelopeIcon className="w-6 h-6" />
            {unreadCounts.messages > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || 'User'}</span>
            </button>

            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                    {user?.plan === 'pro' ? 'Pro Plan' : user?.plan === 'premium' ? 'Premium Plan' : 'Free Plan'}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircleIcon className="w-4 h-4 mr-3" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Cog6ToothIcon className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      toggleDarkMode();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isDarkMode ? (
                      <>
                        <SunIcon className="w-4 h-4 mr-3" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <MoonIcon className="w-4 h-4 mr-3" />
                        Dark Mode
                      </>
                    )}
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onUpdate={loadUnreadCounts}
      />

      {/* Messages Panel */}
      <MessagesPanel 
        isOpen={showMessages} 
        onClose={() => setShowMessages(false)}
        onUpdate={loadUnreadCounts}
      />
    </header>
  );
};

export default Header;
