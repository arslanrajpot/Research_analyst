import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  PhotoIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

const ReportExport = ({ report, onClose }) => {
  const [exporting, setExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional PDF with formatting',
      icon: DocumentTextIcon,
      color: 'bg-red-500',
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Editable Microsoft Word format',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
    },
    {
      id: 'pptx',
      name: 'PowerPoint',
      description: 'Presentation-ready slides',
      icon: PresentationChartBarIcon,
      color: 'bg-orange-500',
    },
    {
      id: 'html',
      name: 'Web Page',
      description: 'Interactive HTML version',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Structured data format',
      icon: TableCellsIcon,
      color: 'bg-purple-500',
    },
    {
      id: 'png',
      name: 'Screenshot',
      description: 'High-quality image',
      icon: PhotoIcon,
      color: 'bg-indigo-500',
    },
  ];

  const handleExport = async (format) => {
    setExporting(true);
    try {
      switch (format) {
        case 'pdf':
          await exportToPDF();
          break;
        case 'docx':
          await exportToWord();
          break;
        case 'pptx':
          await exportToPowerPoint();
          break;
        case 'html':
          await exportToHTML();
          break;
        case 'json':
          await exportToJSON();
          break;
        case 'png':
          await exportToPNG();
          break;
        default:
          throw new Error('Unsupported format');
      }
      toast.success(`${exportFormats.find(f => f.id === format)?.name} exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    // Use jsPDF or similar library for PDF generation
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(report.query, 20, 20);
    
    // Add metadata
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date(report.createdAt).toLocaleString()}`, 20, 40);
    doc.text(`Template: ${report.template}`, 20, 50);
    
    // Add content (simplified)
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(report.content, 170);
    doc.text(lines, 20, 70);
    
    doc.save(`${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`);
  };

  const exportToWord = async () => {
    // Use docx library for Word document generation
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: report.query,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${new Date(report.createdAt).toLocaleString()}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: report.content,
                size: 24,
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_report.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPowerPoint = async () => {
    // Use PptxGenJS for PowerPoint generation
    const pptx = await import('pptxgenjs');
    const pres = new pptx.default();
    
    // Title slide
    const slide1 = pres.addSlide();
    slide1.addText(report.query, {
      x: 1, y: 1, w: 8, h: 2,
      fontSize: 24, bold: true, align: 'center'
    });
    slide1.addText(`Generated: ${new Date(report.createdAt).toLocaleString()}`, {
      x: 1, y: 3, w: 8, h: 1,
      fontSize: 14, align: 'center'
    });
    
    // Content slides (split by sections)
    const sections = report.content.split(/(?=^## )/m);
    sections.forEach((section, index) => {
      if (section.trim()) {
        const slide = pres.addSlide();
        const title = section.match(/^## (.+)$/m)?.[1] || `Section ${index + 1}`;
        slide.addText(title, {
          x: 0.5, y: 0.5, w: 9, h: 1,
          fontSize: 18, bold: true
        });
        slide.addText(section.replace(/^## .+$/m, '').trim(), {
          x: 0.5, y: 1.5, w: 9, h: 5,
          fontSize: 12
        });
      }
    });
    
    pres.writeFile({ fileName: `${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx` });
  };

  const exportToHTML = async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report.query}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .metadata { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .content { margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${report.query}</h1>
          <div class="metadata">
            <strong>Generated:</strong> ${new Date(report.createdAt).toLocaleString()}<br>
            <strong>Template:</strong> ${report.template}
          </div>
          <div class="content">
            ${report.content}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_report.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = async () => {
    const jsonData = {
      query: report.query,
      content: report.content,
      template: report.template,
      createdAt: report.createdAt,
      metadata: {
        generated: new Date(report.createdAt).toLocaleString(),
        template: report.template,
        status: report.status
      }
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPNG = async () => {
    // Use html2canvas to capture the report as image
    const html2canvas = await import('html2canvas');
    
    // Create a temporary div with the report content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div style="background: white; padding: 40px; font-family: Arial, sans-serif; max-width: 800px;">
        <h1 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${report.query}
        </h1>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Generated:</strong> ${new Date(report.createdAt).toLocaleString()}<br>
          <strong>Template:</strong> ${report.template}
        </div>
        <div style="margin-top: 20px;">
          ${report.content}
        </div>
      </div>
    `;
    document.body.appendChild(tempDiv);
    
    const canvas = await html2canvas.default(tempDiv.firstElementChild);
    document.body.removeChild(tempDiv);
    
    const link = document.createElement('a');
    link.download = `${report.query.replace(/[^a-zA-Z0-9]/g, '_')}_screenshot.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const shareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: report.query,
          text: `Market Research Report: ${report.query}`,
          url: window.location.href,
        });
        toast.success('Report shared successfully!');
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `Market Research Report: ${report.query}\n\n${window.location.href}`;
      await navigator.clipboard.writeText(shareText);
      toast.success('Report link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Export Report
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose a format to export your report
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleExport(format.id)}
                disabled={exporting}
                className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 ${
                  exporting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${format.color} text-white`}>
                    <format.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {format.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={shareReport}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              <span>Share Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;




