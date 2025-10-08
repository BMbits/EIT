
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
        <div 
          className={`w-full max-w-2xl p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-blue-500 bg-gray-800/50' : 'border-gray-700 hover:border-gray-600'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-center">
            <UploadIcon className="w-16 h-16 mb-4 text-gray-500" />
            <h2 className="text-2xl font-semibold mb-2 text-white">Upload Your Excel File</h2>
            <p className="text-gray-400 mb-6">Drag and drop your .xlsx or .csv file here</p>
            <div className="flex items-center my-4">
              <span className="flex-grow bg-gray-700 h-px"></span>
              <span className="mx-4 text-gray-500 font-semibold">OR</span>
              <span className="flex-grow bg-gray-700 h-px"></span>
            </div>
            <label htmlFor="file-upload" className="cursor-pointer relative">
              <span className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200">
                Browse Files
              </span>
              <input 
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                disabled={isLoading}
              />
            </label>
            <p className="mt-4 text-sm text-gray-500">Supported formats: .xlsx, .csv</p>
          </div>
        </div>
    </div>
  );
};

export default FileUpload;
