import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // Handle OAuth error
      window.opener?.postMessage(
        { type: 'GOOGLE_OAUTH_ERROR', error },
        window.location.origin
      );
      window.close();
      return;
    }

    if (code) {
      // Send success message to parent window
      window.opener?.postMessage(
        { type: 'GOOGLE_OAUTH_SUCCESS', code },
        window.location.origin
      );
      window.close();
    } else {
      // No code or error, close window
      window.opener?.postMessage(
        { type: 'GOOGLE_OAUTH_ERROR', error: 'No authorization code received' },
        window.location.origin
      );
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">MR</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Completing sign in...</h1>
        <p className="text-gray-600 dark:text-gray-400">Please wait while we complete your Google sign-in.</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;
