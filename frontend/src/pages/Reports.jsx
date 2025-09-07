import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CalendarIcon,
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useResearch } from '../context/ResearchContext';
import { useDarkMode } from '../context/DarkModeContext';
import { formatDistanceToNow, format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ReportExport from '../components/ReportExport';


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

const Reports = () => {
  const { reports, deleteReport, loadReports, loading } = useResearch();
  const { isDarkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Get unique templates for filter
  const templates = ['all', ...new Set(reports.map(r => r.template))];

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      const matchesSearch = report.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           report.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTemplate = selectedTemplate === 'all' || report.template === selectedTemplate;
      return matchesSearch && matchesTemplate;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'title':
          comparison = a.query.localeCompare(b.query);
          break;
        case 'template':
          comparison = a.template.localeCompare(b.template);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteReport = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      deleteReport(reportId);
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    }
  };

  const handleRefreshReports = async () => {
    try {
      await loadReports();
      toast.success('Reports refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh reports');
    }
  };

  const handleCopyReport = async (report) => {
    try {
      const reportText = `# ${report.query}\n\n${report.content}`;
      await navigator.clipboard.writeText(reportText);
      toast.success('Report copied to clipboard!');
    } catch (error) {
      console.error('Error copying report:', error);
      toast.error('Failed to copy report to clipboard');
    }
  };

  const handleViewReport = (report) => {
    
    // Clean and escape the report data
    const cleanQuery = report.query.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    const cleanContent = report.content.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    const cleanTemplate = report.template.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const cleanStatus = report.status.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    // Build HTML string piece by piece to avoid template literal issues
    const htmlParts = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<title>' + cleanQuery + '</title>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<style>',
      'body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }',
      '.container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }',
      '.header { background: #667eea; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }',
      '.header h1 { margin: 0; font-size: 24px; }',
      '.download-actions { margin: 20px 0; text-align: center; }',
      '.download-btn { background: #667eea; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer; font-size: 14px; }',
      '.download-btn:hover { background: #5a67d8; }',
      '.content { line-height: 1.6; }',
      '.metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }',

      '.toast { position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 1000; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<div class="header">',
      '<h1>' + cleanQuery + '</h1>',
      '<p>Market Research Report</p>',
      '</div>',

      '<div class="download-actions">',
      '<button class="download-btn" onclick="downloadPDF()">📄 PDF</button>',
      '<button class="download-btn" onclick="downloadWord()">📝 Word</button>',
      '<button class="download-btn" onclick="downloadPowerPoint()">📊 PowerPoint</button>',
      '<button class="download-btn" onclick="downloadHTML()">🌐 HTML</button>',
      '</div>',
      '<div class="metadata">',
      '<strong>Generated:</strong> ' + new Date(report.createdAt).toLocaleString() + '<br>',
      '<strong>Template:</strong> ' + cleanTemplate + '<br>',
      '<strong>Status:</strong> ' + cleanStatus,
      '</div>',
      '<div class="content">',
      report.content.replace(/={3,}/g, '').replace(/\*\*/g, '<strong>').replace(/\*/g, '</strong>').replace(/\n/g, '<br>'),
      '</div>',
      '</div>',
      '<script>',
      'let reportData = {',
      '  query: "' + cleanQuery + '",',
      '  content: "' + cleanContent + '",',
      '  createdAt: "' + report.createdAt + '",',
      '  template: "' + cleanTemplate + '",',
      '  status: "' + cleanStatus + '"',
      '};',

      'function showToast(message, type = "success") {',
      '  const toast = document.createElement("div");',
      '  toast.className = "toast";',
      '  toast.style.background = type === "success" ? "#4CAF50" : "#f44336";',
      '  toast.textContent = message;',
      '  document.body.appendChild(toast);',
      '  setTimeout(() => {',
      '    toast.style.opacity = "0";',
      '    toast.style.transform = "translateX(100%)";',
      '    setTimeout(() => document.body.removeChild(toast), 300);',
      '  }, 3000);',
      '}',

      'async function downloadPDF() {',
      '  try {',
      '    const script = document.createElement("script");',
      '    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";',
      '    document.head.appendChild(script);',
      '    await new Promise((resolve) => {',
      '      script.onload = resolve;',
      '    });',
      '    const doc = new window.jspdf.jsPDF();',
      '    // Set professional colors',
      '    const primaryColor = [102, 126, 234];',
      '    const secondaryColor = [118, 75, 162];',
      '    const textColor = [31, 41, 55];',
      '    const lightGray = [156, 163, 175];',
      '    // Add header with gradient effect',
      '    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);',
      '    doc.rect(0, 0, 210, 40, "F");',
      '    // Add company logo/name',
      '    doc.setTextColor(255, 255, 255);',
      '    doc.setFontSize(16);',
      '    doc.setFont("helvetica", "bold");',
      '    doc.text("Market Research Pro", 20, 20);',
      '    // Add subtitle',
      '    doc.setFontSize(10);',
      '    doc.setFont("helvetica", "normal");',
      '    doc.text("AI-Powered Market Intelligence Platform", 20, 30);',
      '    // Add report title',
      '    doc.setTextColor(textColor[0], textColor[1], textColor[2]);',
      '    doc.setFontSize(18);',
      '    doc.setFont("helvetica", "bold");',
      '    const titleLines = doc.splitTextToSize(reportData.query, 170);',
      '    doc.text(titleLines, 20, 55);',
      '    // Add metadata section',
      '    doc.setFillColor(248, 250, 252);',
      '    doc.rect(20, 70, 170, 25, "F");',
      '    doc.setFontSize(10);',
      '    doc.setFont("helvetica", "normal");',
      '    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);',
      '    doc.text("Generated:", 25, 80);',
      '    doc.text("Template:", 25, 90);',
      '    doc.text("Status:", 25, 100);',
      '    doc.setTextColor(textColor[0], textColor[1], textColor[2]);',
      '    doc.setFont("helvetica", "bold");',
      '    doc.text(new Date(reportData.createdAt).toLocaleString(), 60, 80);',
      '    doc.text(reportData.template, 60, 90);',
      '    doc.text(reportData.status, 60, 100);',
      '    // Add content with professional formatting',
      '    doc.setFontSize(11);',
      '    doc.setFont("helvetica", "normal");',
      '    doc.setTextColor(textColor[0], textColor[1], textColor[2]);',
      '    let yPosition = 120;',
      '    // Use simple text content without complex formatting',
      '    const content = reportData.content;',
      '    // Simple cleanup - just remove markdown symbols',
      '    let cleanContent = content;',
      '    cleanContent = cleanContent.replace(/\\*\\*/g, "");',
      '    cleanContent = cleanContent.replace(/\\*/g, "");',
      '    cleanContent = cleanContent.replace(/=/g, "");',
      '    cleanContent = cleanContent.replace(/\\\\/g, "");',
      '    cleanContent = cleanContent.replace(/\\n/g, " ");',
      '    cleanContent = cleanContent.replace(/\\s+/g, " ");',
      '    cleanContent = cleanContent.trim();',
      '    // Split content into simple paragraphs',
      '    const paragraphs = cleanContent.split(/\\. /);',
      '    paragraphs.forEach((paragraph, index) => {',
      '      if (paragraph.trim()) {',
      '        if (yPosition > 270) {',
      '          doc.addPage();',
      '          yPosition = 20;',
      '        }',
      '        const contentLines = doc.splitTextToSize(paragraph + ".", 170);',
      '        doc.setFontSize(10);',
      '        doc.setFont("helvetica", "normal");',
      '        doc.setTextColor(textColor[0], textColor[1], textColor[2]);',
      '        contentLines.forEach(line => {',
      '          if (yPosition > 270) {',
      '            doc.addPage();',
      '            yPosition = 20;',
      '          }',
      '          doc.text(line, 20, yPosition);',
      '          yPosition += 5;',
      '        });',
      '        yPosition += 3; // Add space between paragraphs',
      '      }',
      '    });',
      '    const filename = reportData.query.replace(/[^a-zA-Z0-9]/g, "_") + "_report.pdf";',
      '    doc.save(filename);',
      '    showToast("PDF generated successfully! 📄");',
      '  } catch (error) {',
      '    showToast("PDF generation failed: " + error.message, "error");',
      '  }',
      '}',
      'function downloadWord() {',
      '  try {',
      '    let cleanContent = reportData.content;',
      '    cleanContent = cleanContent.replace(/\\*\\*/g, "");',
      '    cleanContent = cleanContent.replace(/\\*/g, "");',
      '    cleanContent = cleanContent.replace(/=/g, "");',
      '    cleanContent = cleanContent.replace(/\\\\/g, "");',
      '    cleanContent = cleanContent.replace(/\\n/g, " ");',
      '    cleanContent = cleanContent.replace(/\\s+/g, " ");',
      '    cleanContent = cleanContent.trim();',
      '    const content = "<html xmlns:o=\\"urn:schemas-microsoft-com:office:office\\" xmlns:w=\\"urn:schemas-microsoft-com:office:word\\" xmlns=\\"http://www.w3.org/TR/REC-html40\\"><head><meta charset=\\"utf-8\\"><title>" + reportData.query + "</title><style>body { font-family: \\"Times New Roman\\", serif; font-size: 12pt; line-height: 1.5; } h1, h2, h3 { color: #2c3e50; } h1 { font-size: 18pt; font-weight: bold; } h2 { font-size: 16pt; font-weight: bold; } h3 { font-size: 14pt; font-weight: bold; } p { margin-bottom: 12pt; } ul, ol { margin-bottom: 12pt; } li { margin-bottom: 6pt; }</style></head><body><h1>" + reportData.query + "</h1><p><strong>Generated:</strong> " + new Date(reportData.createdAt).toLocaleString() + "</p><p><strong>Template:</strong> " + reportData.template + "</p><p><strong>Status:</strong> " + reportData.status + "</p><hr>" + cleanContent + "</body></html>";',
      '    const blob = new Blob([content], { type: "application/msword" });',
      '    const url = URL.createObjectURL(blob);',
      '    const a = document.createElement("a");',
      '    a.href = url;',
      '    a.download = reportData.query.replace(/[^a-zA-Z0-9]/g, "_") + "_report.doc";',
      '    a.click();',
      '    URL.revokeObjectURL(url);',
      '    showToast("Word document downloaded! 📝");',
      '  } catch (error) {',
      '    showToast("Word download failed: " + error.message, "error");',
      '  }',
      '}',
      'function downloadPowerPoint() {',
      '  try {',
      '    let cleanContent = reportData.content;',
      '    cleanContent = cleanContent.replace(/\\*\\*/g, "");',
      '    cleanContent = cleanContent.replace(/\\*/g, "");',
      '    cleanContent = cleanContent.replace(/=/g, "");',
      '    cleanContent = cleanContent.replace(/\\\\/g, "");',
      '    cleanContent = cleanContent.replace(/\\n/g, " ");',
      '    cleanContent = cleanContent.replace(/\\s+/g, " ");',
      '    cleanContent = cleanContent.trim();',
      '    const content = "<html><head><meta charset=\\"utf-8\\"><title>" + reportData.query + " - Presentation</title><style>body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; } .slide { background: white; margin: 20px auto; padding: 40px; max-width: 800px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); page-break-after: always; } h1 { color: #2c3e50; font-size: 32px; margin-bottom: 20px; } h2 { color: #34495e; font-size: 24px; margin-bottom: 15px; } h3 { color: #7f8c8d; font-size: 20px; margin-bottom: 10px; } p { font-size: 16px; line-height: 1.6; margin-bottom: 15px; } ul, ol { font-size: 16px; line-height: 1.6; } li { margin-bottom: 8px; } .title-slide { text-align: center; } .title-slide h1 { font-size: 48px; margin-bottom: 30px; } .title-slide p { font-size: 18px; color: #7f8c8d; }</style></head><body><div class=\\"slide title-slide\\"><h1>" + reportData.query + "</h1><p>Market Research Report</p><p>Generated: " + new Date(reportData.createdAt).toLocaleString() + "</p><p>Template: " + reportData.template + "</p></div>" + cleanContent + "</body></html>";',
      '    const blob = new Blob([content], { type: "text/html" });',
      '    const url = URL.createObjectURL(blob);',
      '    const a = document.createElement("a");',
      '    a.href = url;',
      '    a.download = reportData.query.replace(/[^a-zA-Z0-9]/g, "_") + "_presentation.html";',
      '    a.click();',
      '    URL.revokeObjectURL(url);',
      '    showToast("PowerPoint presentation downloaded! 📊");',
      '  } catch (error) {',
      '    showToast("PowerPoint download failed: " + error.message, "error");',
      '  }',
      '}',
      'function downloadHTML() {',
      '  try {',
      '    let cleanContent = reportData.content;',
      '    cleanContent = cleanContent.replace(/\\*\\*/g, "");',
      '    cleanContent = cleanContent.replace(/\\*/g, "");',
      '    cleanContent = cleanContent.replace(/=/g, "");',
      '    cleanContent = cleanContent.replace(/\\\\/g, "");',
      '    cleanContent = cleanContent.replace(/\\n/g, " ");',
      '    cleanContent = cleanContent.replace(/\\s+/g, " ");',
      '    cleanContent = cleanContent.trim();',
      '    const content = "<html><body><h1>" + reportData.query + "</h1><p>" + cleanContent + "</p></body></html>";',
      '    const blob = new Blob([content], { type: "text/html" });',
      '    const url = URL.createObjectURL(blob);',
      '    const a = document.createElement("a");',
      '    a.href = url;',
      '    a.download = reportData.query.replace(/[^a-zA-Z0-9]/g, "_") + "_report.html";',
      '    a.click();',
      '    URL.revokeObjectURL(url);',
      '    showToast("HTML document downloaded! 🌐");',
      '  } catch (error) {',
      '    showToast("HTML download failed: " + error.message, "error");',
      '  }',
      '}',
      'try {',
      '  window.downloadPDF = downloadPDF;',
      '  window.downloadWord = downloadWord;',
      '  window.downloadPowerPoint = downloadPowerPoint;',
      '  window.downloadHTML = downloadHTML;',
      '} catch (error) {',
      '  console.error("Error making functions global:", error);',
      '}',
      '</script>',
      '</body>',
      '</html>'
    ];
    
    const reportHTML = htmlParts.join('\n');
    
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    
    // Clean up the blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <span>{children}</span>
      {sortBy === field && (
        sortOrder === 'asc' ? (
          <ArrowUpIcon className="w-4 h-4" />
        ) : (
          <ArrowDownIcon className="w-4 h-4" />
        )
      )}
    </button>
  );

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view your market research reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredReports.length} of {reports.length} reports
          </span>
          <button
            onClick={handleRefreshReports}
            disabled={loading}
            className={`p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh reports"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Filters & Report List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </h3>
            
            {/* Template Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {templates.map(template => (
                  <option key={template} value={template}>
                    {template === 'all' ? 'All Templates' : template}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
              <div className="space-y-2">
                <SortButton field="date">Date Created</SortButton>
                <SortButton field="title">Title</SortButton>
                <SortButton field="template">Template</SortButton>
              </div>
            </div>
          </div>

          {/* Report List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Reports</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
                </div>
              ) : filteredReports.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedReport?.id === report.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{report.query}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {formatDate(report.createdAt)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <TagIcon className="w-4 h-4 mr-1" />
                            {report.template}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Report Detail */}
        <div className="lg:col-span-3">
          {selectedReport ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Report Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{selectedReport.query}</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {format(new Date(selectedReport.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="flex items-center">
                        <TagIcon className="w-4 h-4 mr-1" />
                        {selectedReport.template}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleViewReport(selectedReport)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="View in new tab"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleCopyReport(selectedReport)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Copy to clipboard"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowExportModal(true)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Export report"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReport(selectedReport.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete report"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="p-6">
                <div className="markdown-content text-gray-900 dark:text-gray-100">
                  <ReactMarkdown>{selectedReport.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a report</h3>
              <p className="text-gray-500 dark:text-gray-400">Choose a report from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Modal */}
      {showExportModal && selectedReport && (
        <ReportExport 
          report={selectedReport} 
          onClose={() => setShowExportModal(false)} 
        />
      )}
    </div>
  );
};

export default Reports;
