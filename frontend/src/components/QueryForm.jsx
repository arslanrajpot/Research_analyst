import React, { useState } from 'react';
import axios from 'axios';
import { useDarkMode } from '../context/DarkModeContext';

function QueryForm({ setReport, setSessionId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useDarkMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/research/generate', { query });
      setReport(response.data);
      setSessionId(response.data.session_id); // Assume API returns session_id
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your market research query"
        className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg"
      />
      <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white p-2 mt-2 rounded-lg disabled:opacity-50 transition-colors">
        {loading ? 'Generating...' : 'Generate Report'}
      </button>
    </form>
  );
}

export default QueryForm;