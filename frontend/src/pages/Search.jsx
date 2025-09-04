import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ChartBarIcon,
  BookmarkIcon,
  ArrowDownTrayIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  BookOpenIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import SearchComponent from '../components/SearchComponent';
import { useDarkMode } from '../context/DarkModeContext';

const Search = () => {
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('search');
  const [searchResults, setSearchResults] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q');

  const features = [
    {
      icon: MagnifyingGlassIcon,
      title: 'Multi-Source Search',
      description: 'Search across web, social media, news, and reports simultaneously',
      color: 'text-blue-600'
    },
    {
      icon: SparklesIcon,
      title: 'Semantic Search',
      description: 'AI-powered search that understands context and intent',
      color: 'text-purple-600'
    },
    {
      icon: ChartBarIcon,
      title: 'Advanced Analytics',
      description: 'Track search patterns and get insights into popular queries',
      color: 'text-green-600'
    },
    {
      icon: BookmarkIcon,
      title: 'Saved Searches',
      description: 'Save and reuse your most important search queries',
      color: 'text-orange-600'
    },
    {
      icon: ArrowDownTrayIcon,
      title: 'Export Results',
      description: 'Download search results in JSON or CSV formats',
      color: 'text-red-600'
    },
    {
      icon: LightBulbIcon,
      title: 'Smart Suggestions',
      description: 'Get intelligent search suggestions as you type',
      color: 'text-indigo-600'
    }
  ];

  const searchSources = [
    {
      icon: GlobeAltIcon,
      name: 'Web Search',
      description: 'Comprehensive web search across millions of pages',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      name: 'Social Media',
      description: 'Real-time social media monitoring and analysis',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: NewspaperIcon,
      name: 'News & Media',
      description: 'Latest news articles and media coverage',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: BookOpenIcon,
      name: 'Reports & Documents',
      description: 'Industry reports, whitepapers, and research documents',
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  const handleSearchResult = (results) => {
    setSearchResults(results);
  };

  // Auto-perform search if query parameter is present
  useEffect(() => {
    if (initialQuery) {
      setActiveTab('search');
    }
  }, [initialQuery]);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Advanced Market Research Search
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
          >
            Discover market insights, track competitors, and analyze trends with our comprehensive search platform
          </motion.p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              {[
                { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
                { id: 'features', label: 'Features', icon: LightBulbIcon },
                { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Search Sources Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search Sources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {searchSources.map((source, index) => {
                    const Icon = source.icon;
                    return (
                      <motion.div
                        key={source.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${source.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{source.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{source.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Main Search Component */}
              <SearchComponent 
                onSearchResult={handleSearchResult} 
                initialQuery={initialQuery}
              />
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4`}>
                        <Icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* How It Works */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-blue-600">1</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Enter Your Query</h3>
                    <p className="text-gray-600 dark:text-gray-400">Type your market research question or use our smart suggestions</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Search</h3>
                    <p className="text-gray-600 dark:text-gray-400">Our AI searches across multiple sources simultaneously</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Get Insights</h3>
                    <p className="text-gray-600 dark:text-gray-400">Receive comprehensive results with sentiment analysis and metadata</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Searches</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Queries</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">567</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <ArrowTrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saved Searches</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">89</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <BookmarkIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">45</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <UserGroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Trends */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Popular Search Topics</h2>
                <div className="space-y-4">
                  {[
                    { topic: 'AI Startups', count: 156, trend: '+12%' },
                    { topic: 'Market Analysis', count: 134, trend: '+8%' },
                    { topic: 'Competitor Research', count: 98, trend: '+15%' },
                    { topic: 'Industry Trends', count: 87, trend: '+5%' },
                    { topic: 'Investment Opportunities', count: 76, trend: '+20%' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{item.topic}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.count} searches</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{item.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Search;
