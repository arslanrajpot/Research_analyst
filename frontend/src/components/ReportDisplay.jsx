import React from 'react';
import ReactMarkdown from 'react-markdown';

function ReportDisplay({ report }) {
  return (
    <div className="border p-4 mb-4">
      <h2 className="text-2xl font-bold mb-2">Research Report</h2>
      <ReactMarkdown>{report}</ReactMarkdown>
    </div>
  );
}

export default ReportDisplay;
