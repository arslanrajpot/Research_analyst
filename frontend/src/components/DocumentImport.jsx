import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  DocumentIcon,
  PhotoIcon,
  TableCellsIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useDarkMode } from '../context/DarkModeContext';

const DocumentImport = ({ onClose, onImportComplete }) => {
  const { isDarkMode } = useDarkMode();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [importProgress, setImportProgress] = useState({});
  const fileInputRef = useRef(null);

  const supportedFormats = [
    { type: 'pdf', name: 'PDF Documents', icon: DocumentTextIcon, extensions: ['.pdf'] },
    { type: 'docx', name: 'Word Documents', icon: DocumentTextIcon, extensions: ['.docx', '.doc'] },
    { type: 'pptx', name: 'PowerPoint Presentations', icon: DocumentTextIcon, extensions: ['.pptx', '.ppt'] },
    { type: 'xlsx', name: 'Excel Spreadsheets', icon: TableCellsIcon, extensions: ['.xlsx', '.xls', '.csv'] },
    { type: 'txt', name: 'Text Files', icon: DocumentTextIcon, extensions: ['.txt', '.md'] },
    { type: 'image', name: 'Images', icon: PhotoIcon, extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const format = supportedFormats.find(f => 
      f.extensions.some(ext => ext.slice(1) === extension)
    );
    return format ? format.icon : DocumentIcon;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
    setUploading(true);
    
    try {
      for (const fileData of uploadedFiles) {
        if (fileData.status === 'pending') {
          setImportProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'uploading', progress: 0 }
          }));

          const formData = new FormData();
          formData.append('file', fileData.file);
          formData.append('filename', fileData.name);
          formData.append('file_type', fileData.type);

          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setImportProgress(prev => ({
              ...prev,
              [fileData.id]: {
                ...prev[fileData.id],
                progress: Math.min(prev[fileData.id]?.progress + 10, 90)
              }
            }));
          }, 200);

          try {
            const response = await fetch('/api/documents/upload', {
              method: 'POST',
              body: formData,
            });

            clearInterval(progressInterval);

            if (response.ok) {
              const result = await response.json();
              setImportProgress(prev => ({
                ...prev,
                [fileData.id]: { status: 'completed', progress: 100 }
              }));
              
              setUploadedFiles(prev => prev.map(f => 
                f.id === fileData.id 
                  ? { ...f, status: 'completed', documentId: result.document_id }
                  : f
              ));
            } else {
              throw new Error('Upload failed');
            }
          } catch (error) {
            clearInterval(progressInterval);
            setImportProgress(prev => ({
              ...prev,
              [fileData.id]: { status: 'error', progress: 0 }
            }));
            
            setUploadedFiles(prev => prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'error' }
                : f
            ));
          }
        }
      }

      const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
      if (completedFiles.length > 0) {
        toast.success(`${completedFiles.length} document(s) imported successfully!`);
        if (onImportComplete) {
          onImportComplete(completedFiles);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const completedCount = uploadedFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadedFiles.filter(f => f.status === 'error').length;
  const pendingCount = uploadedFiles.filter(f => f.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'dark' : ''
        }`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import Documents
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload documents to analyze and include in your research
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Supported Formats */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Supported Formats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {supportedFormats.map((format) => (
                <div
                  key={format.type}
                  className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <format.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {format.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Upload documents to enhance your research with additional context
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Files to Import ({uploadedFiles.length})
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  {completedCount > 0 && (
                    <span className="text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      {completedCount} completed
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-600 dark:text-red-400 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errorCount} failed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadedFiles.map((fileData) => {
                  const FileIcon = getFileIcon(fileData.name);
                  const progress = importProgress[fileData.id];

                  return (
                    <div
                      key={fileData.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        fileData.status === 'completed'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          : fileData.status === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <FileIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {fileData.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(fileData.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {progress && (
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress.status === 'completed'
                                    ? 'bg-green-500'
                                    : progress.status === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {progress.progress}%
                            </span>
                          </div>
                        )}

                        {fileData.status === 'completed' && (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        )}

                        {fileData.status === 'error' && (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        )}

                        <button
                          onClick={() => removeFile(fileData.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={uploadFiles}
              disabled={uploading || uploadedFiles.length === 0 || pendingCount === 0}
              className={`px-6 py-2 rounded-lg transition-colors ${
                uploading || uploadedFiles.length === 0 || pendingCount === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? 'Importing...' : `Import ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocumentImport;
