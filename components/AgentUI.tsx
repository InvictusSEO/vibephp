import React, { useEffect, useRef } from 'react';
import type { AgentStatus } from '../types';

interface AgentUIProps {
  status: AgentStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AgentUI({ status, onConfirm, onCancel }: AgentUIProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [status.streamContent]);

  if (status.state === 'IDLE') return null;

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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-gray-900 border border-gray-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              {status.state === 'PLANNING' || status.state === 'CODING' || status.state === 'VERIFYING' ? '⚙️' :
               status.state === 'ERROR_DETECTED' ? '❌' : '🤖'}
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{getStatusTitle()}</h3>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-5 bg-gray-950/50"
        >
          {status.error && (
            <div className="mb-5 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              <strong className="text-red-300 font-semibold">Error Details:</strong>
              <pre className="whitespace-pre-wrap font-mono text-xs bg-red-900/20 p-3 rounded-lg mt-2 overflow-x-auto">
                {status.error}
              </pre>
            </div>
          )}
          
          {status.streamContent && (
            <div className="text-gray-300 whitespace-pre-wrap">
              {status.streamContent}
            </div>
          )}

          {(status.state === 'PLANNING' || status.state === 'PLANNING_FIX') && (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>AI is working...</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-800 bg-gray-900/50">
          <div className="flex flex-col gap-3">
            {status.state === 'PLAN_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-medium"
                >
                  Start Building App
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white"
                >
                  Cancel & Review Plan
                </button>
              </>
            )}

            {status.state === 'ERROR_DETECTED' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3.5 rounded-xl font-medium"
                >
                  Auto-Fix with AI
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white"
                >
                  Dismiss & Try Manually
                </button>
              </>
            )}

            {status.state === 'FIX_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-medium"
                >
                  Apply Fix & Retry
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white"
                >
                  Cancel Fix
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
