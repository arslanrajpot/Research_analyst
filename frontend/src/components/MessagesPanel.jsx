import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EnvelopeIcon,
  XMarkIcon,
  ClockIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
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

const MessagesPanel = ({ isOpen, onClose }) => {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadMessages();
    }
  }, [isOpen, user]);

  const loadMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await researchAPI.getMessages(50, false);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await researchAPI.markMessageRead(messageId);
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, read: true } : m)
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await researchAPI.markAllMessagesRead();
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      toast.success('All messages marked as read');
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      toast.error('Failed to mark messages as read');
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'system':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'support':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'update':
        return <InformationCircleIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <EnvelopeIcon className="w-5 h-5 text-gray-500" />;
    }
  };

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

  const filteredMessages = messages.filter(message => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !message.read;
    return message.type === activeTab;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    if (!message.read) {
      markAsRead(message.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 border-l border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[
                { key: 'all', label: 'All', count: messages.length },
                { key: 'unread', label: 'Unread', count: unreadCount },
                { key: 'system', label: 'System', count: messages.filter(m => m.type === 'system').length },
                { key: 'support', label: 'Support', count: messages.filter(m => m.type === 'support').length },
                { key: 'update', label: 'Updates', count: messages.filter(m => m.type === 'update').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredMessages.length > 0 ? (
                <div className="p-4 space-y-3">
                  {filteredMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                        message.priority === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                        message.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' :
                        'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                      } ${
                        !message.read ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                      } ${
                        selectedMessage?.id === message.id 
                          ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
                      }`}
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {message.senderAvatar ? (
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {message.senderAvatar}
                              </span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              {getMessageIcon(message.type)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {message.title}
                            </h3>
                            {!message.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {message.sender}
                          </p>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatDate(message.created_at)}</span>
                            </div>
                            <ArrowTopRightOnSquareIcon className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                  <EnvelopeIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No messages
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === 'all' 
                      ? "Your inbox is empty. Check back later for updates."
                      : `No ${activeTab} messages at the moment.`
                    }
                  </p>
                </div>
              )}
            </div>

            {selectedMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {selectedMessage.senderAvatar ? (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {selectedMessage.senderAvatar}
                        </span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        {getMessageIcon(selectedMessage.type)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedMessage.sender}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(selectedMessage.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedMessage.title}
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {selectedMessage.content}
                  </div>
                  {selectedMessage.category && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full capitalize">
                        {selectedMessage.category}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MessagesPanel;
