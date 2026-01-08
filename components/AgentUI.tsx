import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { AgentStatus } from '../types';

interface AgentUIProps {
  status: AgentStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AgentUI({ status, onConfirm, onCancel }: AgentUIProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status.streamContent]);

  if (status.state === 'IDLE') return null;

  const getStatusIcon = () => {
    switch (status.state) {
      case 'PLANNING':
      case 'CODING':
      case 'VERIFYING':
      case 'PLANNING_FIX':
        return <i className="fas fa-cog animate-spin text-blue-400 text-lg"></i>;
      case 'PLAN_READY':
        return <i className="fas fa-clipboard-check text-green-400 text-lg"></i>;
      case 'ERROR_DETECTED':
        return <i className="fas fa-exclamation-triangle text-red-400 text-lg"></i>;
      case 'FIX_READY':
        return <i className="fas fa-tools text-yellow-400 text-lg"></i>;
      default:
        return <i className="fas fa-robot text-purple-400 text-lg"></i>;
    }
  };

  const getStatusTitle = () => {
    switch (status.state) {
      case 'PLANNING': return 'Designing Architecture';
      case 'PLAN_READY': return 'Plan Ready for Review';
      case 'CODING': return 'Writing Code';
      case 'VERIFYING': return 'Testing Application';
      case 'ERROR_DETECTED': return 'Error Detected';
      case 'PLANNING_FIX': return 'Analyzing Fix';
      case 'FIX_READY': return 'Fix Strategy Ready';
      default: return 'Processing';
    }
  };

  const getStatusDescription = () => {
    switch (status.state) {
      case 'PLANNING': return 'Analyzing requirements and designing the app structure';
      case 'PLAN_READY': return 'Review the implementation plan before coding begins';
      case 'CODING': return 'Generating PHP code based on your requirements';
      case 'VERIFYING': return 'Running tests and checking for errors';
      case 'ERROR_DETECTED': return 'An error occurred during deployment';
      case 'PLANNING_FIX': return 'Analyzing the error and planning a fix';
      case 'FIX_READY': return 'Ready to apply the fix to your code';
      default: return 'Processing your request';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`
        ${isMobile ? 'w-full h-full max-h-full rounded-none' : 'max-w-2xl max-h-[85vh] rounded-2xl'} 
        bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 
        flex flex-col shadow-2xl overflow-hidden
      `}>
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-white text-lg">{getStatusTitle()}</h3>
              <p className="text-sm text-gray-400">{getStatusDescription()}</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-white transition-colors touch-target"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content Area */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-5 bg-gray-950/50 custom-scrollbar"
        >
          {status.error && (
            <div className="mb-5 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-exclamation-circle text-red-400"></i>
                <strong className="text-red-300 font-semibold">Error Details:</strong>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs bg-red-900/20 p-3 rounded-lg overflow-x-auto">
                {status.error}
              </pre>
            </div>
          )}
          
          {status.streamContent && (
            <div className="prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-semibold prose-code:text-blue-300 prose-code:bg-gray-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:p-4 prose-pre:overflow-x-auto prose-ul:text-gray-300 prose-li:my-1">
              <ReactMarkdown>
                {status.streamContent}
              </ReactMarkdown>
            </div>
          )}

          {/* Loading indicator for streaming */}
          {['PLANNING', 'CODING', 'VERIFYING', 'PLANNING_FIX'].includes(status.state) && (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>AI is working on it...</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-800 bg-gray-900/50">
          <div className="flex flex-col gap-3">
            {status.state === 'PLAN_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 touch-target"
                >
                  <i className="fas fa-play-circle text-lg"></i>
                  Start Building App
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors touch-target"
                >
                  Cancel & Review Plan
                </button>
              </>
            )}

            {status.state === 'ERROR_DETECTED' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/20 touch-target"
                >
                  <i className="fas fa-magic text-lg"></i>
                  Auto-Fix with AI
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors touch-target"
                >
                  Dismiss & Try Manually
                </button>
              </>
            )}

            {status.state === 'FIX_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 touch-target"
                >
                  <i className="fas fa-check-circle text-lg"></i>
                  Apply Fix & Retry
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors touch-target"
                >
                  Cancel Fix
                </button>
              </>
            )}

            {/* Progress indicator for processing states */}
            {['PLANNING', 'CODING', 'VERIFYING', 'PLANNING_FIX'].includes(status.state) && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Processing...</span>
                <span className="font-mono">{Math.min(status.streamContent.length / 10, 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
