import React from 'react';
import { motion } from 'framer-motion';
import { useDarkMode } from '../context/DarkModeContext';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = 'Loading...',
  showText = true,
  className = '' 
}) => {
  const { isDarkMode } = useDarkMode();
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    purple: 'border-purple-600',
    gray: 'border-gray-600',
    white: 'border-white',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-gray-300 dark:border-gray-600 border-t-2 rounded-full ${colorClasses[color]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {showText && text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-sm text-gray-600 dark:text-gray-400"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;
