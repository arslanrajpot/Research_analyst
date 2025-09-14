import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDarkMode } from '../context/DarkModeContext';

function HistoryView({ sessionId }) {
  const [history, setHistory] = useState(null);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    if (sessionId) {
      axios.get(`http://localhost:8000/research/history/${sessionId}`)
        .then(response => setHistory(response.data))
        .catch(error => console.error('History error:', error));
    }
  }, [sessionId]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-white dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Session History</h2>
      {history ? (
        <div className="text-gray-700 dark:text-gray-300">
          <p><strong>Query:</strong> {history.query}</p>
          <p><strong>Report:</strong> {history.report}</p>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No history available</p>
      )}
    </div>
  );
}

export default HistoryView;