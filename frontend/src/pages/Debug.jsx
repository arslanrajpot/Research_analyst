import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Debug = () => {
  const { user, loading: authLoading, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const info = {
      user,
      authLoading,
      isAuthenticated: !!user,
      currentUrl: window.location.href,
      authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing',
      refreshToken: localStorage.getItem('refreshToken') ? 'Present' : 'Missing',
    };
    setDebugInfo(info);
    console.log('🔍 Debug Info:', info);
  }, [user, authLoading]);

  const handleTestNavigation = () => {
    console.log('Testing navigation to /research?template=1');
    navigate('/research?template=1');
  };

  const handleDemoLogin = async () => {
    try {
      await demoLogin();
    } catch (error) {
      console.error('Demo login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Debug Page</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Authentication Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">User:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {user ? `${user.full_name} (${user.email})` : 'Not logged in'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auth Loading:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {authLoading ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Is Authenticated:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {!!user ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current URL:</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {window.location.href}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auth Token:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {localStorage.getItem('authToken') ? 'Present' : 'Missing'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Refresh Token:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {localStorage.getItem('refreshToken') ? 'Present' : 'Missing'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
          <div className="flex space-x-4">
            <button
              onClick={handleDemoLogin}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Demo Login
            </button>
            <button
              onClick={handleTestNavigation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Navigation to /research?template=1
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Debug Info (JSON)</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Debug;

