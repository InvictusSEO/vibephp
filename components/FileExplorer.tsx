import React from 'react';
import type { File } from '../types';

interface FileExplorerProps {
  files: File[];
  activeFile: File | null;
  onSelectFile: (file: File) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, onSelectFile }) => {
  return (
    <div className="w-full h-full bg-bolt-gray border-r border-bolt-border flex flex-col">
      <div className="p-4 border-b border-bolt-border">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Explorer</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 && (
          <div className="text-center text-xs text-gray-600 mt-10">No files generated yet.</div>
        )}
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelectFile(file)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md mb-1 transition-colors flex items-center gap-2 ${
              activeFile?.path === file.path
                ? 'bg-bolt-accent text-white'
                : 'text-bolt-text hover:bg-bolt-hover'
            }`}
          >
             <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
            <span className="truncate">{file.path}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;