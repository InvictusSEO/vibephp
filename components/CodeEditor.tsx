import React, { useState, useEffect } from 'react';
import type { File } from '../types';

interface CodeEditorProps {
  file: File | null;
  isMobile?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ file, isMobile = false }) => {
  const [content, setContent] = useState(file?.content || '');
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      const lines = file.content.split('\n').length;
      setLineCount(Math.max(lines, 1));
    }
  }, [file]);

  if (!file) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-500 p-6">
        <i className="fas fa-code text-4xl mb-4 opacity-30"></i>
        <p className="text-center text-sm mb-2">No file selected</p>
        <p className="text-center text-xs text-gray-600 max-w-md">
          Select a file from the explorer or generate code by describing your app
        </p>
      </div>
    );
  }

  const getLanguageColor = (lang?: string) => {
    switch (lang) {
      case 'php': return 'text-purple-400';
      case 'html': return 'text-orange-400';
      case 'css': return 'text-blue-400';
      case 'js': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`w-full h-full ${isMobile ? 'bg-gray-950' : 'bg-gray-950'} flex flex-col`}>
      {/* Editor Header */}
      <div className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'} border-b border-gray-800 bg-gray-900 flex items-center justify-between`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <i className={`fab fa-${file.language === 'php' ? 'php' : 'file-code'} ${getLanguageColor(file.language)}`}></i>
          <div className="text-sm text-gray-300 font-medium truncate">
            {file.path}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
            {file.language?.toUpperCase() || 'TEXT'}
          </span>
          <span className="text-xs text-gray-500">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="min-h-full font-mono text-sm leading-relaxed">
          {/* Line numbers */}
          <div className="flex">
            {/* Line numbers column */}
            <div className={`${isMobile ? 'w-10' : 'w-12'} bg-gray-900/50 text-right text-gray-600 select-none border-r border-gray-800 sticky left-0`}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div 
                  key={i} 
                  className={`${isMobile ? 'py-2.5' : 'py-2.5'} pr-2 text-xs`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            
            {/* Code content */}
            <div className="flex-1">
              <pre className={`${isMobile ? 'p-2' : 'p-4'} whitespace-pre-wrap break-all`}>
                <code className="text-gray-100">
                  {content.split('\n').map((line, index) => {
                    // Simple syntax highlighting for PHP
                    if (file.language === 'php') {
                      const phpClass = line.includes('<?php') || line.includes('?>') 
                        ? 'text-purple-400' 
                        : line.includes('function') || line.includes('class') 
                        ? 'text-blue-400' 
                        : line.includes('echo') || line.includes('return') 
                        ? 'text-yellow-400' 
                        : line.includes('$') 
                        ? 'text-green-400' 
                        : line.includes('Vibe::') 
                        ? 'text-cyan-400 font-semibold' 
                        : 'text-gray-300';
                      
                      return (
                        <div key={index} className={`${isMobile ? 'py-2.5' : 'py-2.5'} ${phpClass}`}>
                          {line || ' '}
                        </div>
                      );
                    }
                    
                    // Default for other languages
                    return (
                      <div key={index} className={`${isMobile ? 'py-2.5' : 'py-2.5'} text-gray-300`}>
                        {line || ' '}
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Footer */}
      <div className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'} border-t border-gray-800 bg-gray-900/50 text-xs text-gray-500 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <i className="fas fa-code"></i>
            <span>Read-only</span>
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-ruler-combined"></i>
            <span>{content.length} chars</span>
          </span>
        </div>
        {isMobile && (
          <div className="text-gray-400 text-[10px]">
            View only • Generated by AI
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
