import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Research Generator', href: '/research', icon: MagnifyingGlassIcon },
  { name: 'Advanced Search', href: '/search', icon: SparklesIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleProfileClick = () => {
    navigate('/settings');
  };

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen"
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">MR</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Market Research Pro</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">AI-Powered Insights</p>
            </div>
          </motion.div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {item.name}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleDarkMode}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            collapsed 
              ? 'justify-center' 
              : 'justify-start'
          } text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="ml-3"
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </motion.span>
          )}
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {authLoading ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                onClick={handleProfileClick}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div 
                className="flex justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                onClick={handleProfileClick}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;
