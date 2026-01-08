import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Play, AlertTriangle, CheckCircle, Wrench, X } from 'lucide-react';
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

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1a1b26] border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-[#15161e]">
          <div className="flex items-center gap-3">
            {['PLANNING', 'CODING', 'VERIFYING', 'PLANNING_FIX'].includes(status.state) ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : status.state === 'ERROR_DETECTED' ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <div className="w-5 h-5 text-green-400 font-bold">AI</div>
            )}
            <h3 className="font-semibold text-white">
              {status.state === 'PLANNING' && 'Architecting Solution...'}
              {status.state === 'PLAN_READY' && 'Review Implementation Plan'}
              {status.state === 'CODING' && 'Building Application...'}
              {status.state === 'VERIFYING' && 'Verifying Integrity...'}
              {status.state === 'ERROR_DETECTED' && 'Diagnostics Failed'}
              {status.state === 'PLANNING_FIX' && 'Analyzing Fix Strategy...'}
              {status.state === 'FIX_READY' && 'Fix Strategy Ready'}
            </h3>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-[#1a1b26] custom-scrollbar">
          {status.error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 font-mono text-sm whitespace-pre-wrap">
              <strong className="block text-red-400 mb-2">Error Log:</strong>
              {status.error}
            </div>
          )}
          
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:text-gray-300">
            <ReactMarkdown>{status.streamContent}</ReactMarkdown>
          </div>

          {['PLANNING', 'PLANNING_FIX'].includes(status.state) && (
            <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"/>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 bg-[#15161e] flex justify-end gap-3">
          {status.state === 'PLAN_READY' && (
            <>
              <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-blue-500/20">
                <Play className="w-4 h-4" /> Start Coding
              </button>
            </>
          )}

          {status.state === 'ERROR_DETECTED' && (
            <>
              <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Ignore & Preview
              </button>
              <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium">
                <Wrench className="w-4 h-4" /> Auto-Fix
              </button>
            </>
          )}

          {status.state === 'FIX_READY' && (
            <>
               <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button onClick={onConfirm} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-green-500/20">
                <CheckCircle className="w-4 h-4" /> Apply Fix
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
