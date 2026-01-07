import React from 'react';
import type { File } from '../types';

interface CodeEditorProps {
  file: File | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-bolt-dark">
        <p>Select a file to view source</p>
      </div>
    );
  }

  // Basic syntax highlighting simulation (very simple)
  // For a real production app we would use Monaco Editor or PrismJS
  return (
    <div className="w-full h-full bg-bolt-dark flex flex-col">
       <div className="px-4 py-2 border-b border-bolt-border bg-bolt-gray text-xs text-gray-400 flex justify-between">
         <span>{file.path}</span>
         <span className="uppercase">{file.language}</span>
       </div>
       <div className="flex-1 overflow-auto p-4">
         <pre className="font-mono text-sm text-bolt-text leading-relaxed whitespace-pre tab-4">
           <code>{file.content}</code>
         </pre>
       </div>
    </div>
  );
};

export default CodeEditor;