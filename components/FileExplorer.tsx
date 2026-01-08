import React from 'react';
import type { File } from '../types';

interface FileExplorerProps {
  files: File[];
  activeFile: File | null;
  onSelectFile: (file: File) => void;
  isMobile?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, onSelectFile, isMobile = false }) => {
  const getFileIcon = (path: string) => {
    if (path.endsWith('.php')) return 'fab fa-php text-purple-500';
    if (path.endsWith('.html')) return 'fab fa-html5 text-orange-500';
    if (path.endsWith('.css')) return 'fab fa-css3-alt text-blue-500';
    if (path.endsWith('.js')) return 'fab fa-js-square text-yellow-500';
    if (path.endsWith('.json')) return 'fas fa-code text-green-500';
    if (path.endsWith('.md')) return 'fas fa-markdown text-gray-400';
    return 'fas fa-file text-gray-400';
  };

  return (
    <div className={`w-full h-full ${isMobile ? 'bg-gray-900' : 'bg-gray-900/95'} flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className="fas fa-folder-open text-blue-400 text-lg"></i>
          <h2 className="font-semibold text-gray-300">Files</h2>
        </div>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
          {files.length}
        </span>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <i className="fas fa-folder-open text-4xl mb-3 opacity-30"></i>
            <p className="text-sm">No files generated yet</p>
            <p className="text-xs mt-1 text-gray-500">Describe your app to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => onSelectFile(file)}
                className={`w-full text-left p-3 text-sm rounded-lg transition-all duration-200 flex items-center gap-3 touch-target ${
                  activeFile?.path === file.path
                    ? 'bg-gray-800 text-white border-l-4 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <i className={`${getFileIcon(file.path)} text-lg w-5 text-center`}></i>
                <div className="flex-1 truncate">{file.path}</div>
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                  {file.language || 'txt'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="text-xs text-gray-500">
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-info-circle"></i>
            <span>Click any file to edit</span>
          </div>
          {isMobile && (
            <div className="text-gray-400 text-[10px]">
              Tap outside to close
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
