import React, { useEffect, useRef } from 'react';
import type { AgentStatus, CodeVersion } from '../types';

interface AgentUIProps {
  status: AgentStatus;
  onConfirm: () => void;
  onCancel: () => void;
  versionHistory?: CodeVersion[];
  onRestoreVersion?: (versionId: string) => void;
}

export function AgentUI({ status, onConfirm, onCancel, versionHistory = [], onRestoreVersion }: AgentUIProps) {
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
      case 'ERROR_DETECTED': return `Error Detected (Attempt ${status.fixAttempt || 0}/3)`;
      case 'PLANNING_FIX': return 'Analyzing Error & Creating Fix';
      case 'FIX_READY': return 'Fix Ready to Apply';
      case 'APPLYING_PATCH': return 'Applying Code Patches';
      default: return 'Processing';
    }
  };

  const getStatusIcon = () => {
    switch (status.state) {
      case 'PLANNING':
      case 'PLANNING_FIX': return '🧠';
      case 'CODING': return '⚙️';
      case 'VERIFYING': return '🔍';
      case 'ERROR_DETECTED': return '❌';
      case 'FIX_READY': return '🔧';
      case 'APPLYING_PATCH': return '📝';
      default: return '🤖';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl">
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{getStatusTitle()}</h3>
              {status.fixAttempt !== undefined && status.fixAttempt > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Fix attempt {status.fixAttempt} of 3
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-white transition-colors"
            title="Cancel"
          >
            ✕
          </button>
        </div>

        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-5 bg-gray-950/50 custom-scrollbar"
        >
          {/* Error Details */}
          {status.errorDetails && (
            <div className="mb-5 p-5 bg-red-900/20 border border-red-500/30 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-xl flex-shrink-0">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h4 className="text-red-300 font-semibold text-lg mb-2">Error Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-red-400 font-medium min-w-[80px]">Type:</span>
                      <span className="text-red-200 uppercase">{status.errorDetails.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-red-400 font-medium min-w-[80px]">File:</span>
                      <span className="text-red-200 font-mono">{status.errorDetails.file}</span>
                    </div>
                    {status.errorDetails.line && (
                      <div className="flex gap-2">
                        <span className="text-red-400 font-medium min-w-[80px]">Line:</span>
                        <span className="text-red-200 font-mono">{status.errorDetails.line}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-red-900/30 rounded-lg p-4 mb-3">
                <div className="text-red-300 font-semibold text-xs mb-2">ERROR MESSAGE:</div>
                <pre className="text-red-200 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {status.errorDetails.message}
                </pre>
              </div>
              
              {status.errorDetails.code && (
                <div className="bg-red-900/30 rounded-lg p-4 mb-3">
                  <div className="text-red-300 font-semibold text-xs mb-2">PROBLEMATIC CODE:</div>
                  <pre className="text-red-200 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                    {status.errorDetails.code}
                  </pre>
                </div>
              )}
              
              {status.errorDetails.suggestion && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-blue-300 font-semibold text-xs mb-2">💡 SUGGESTION:</div>
                  <pre className="text-blue-200 text-sm whitespace-pre-wrap">
                    {status.errorDetails.suggestion}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Stream Content / Fix Details */}
          {status.streamContent && (
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {status.streamContent}
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {(status.state === 'PLANNING' || status.state === 'PLANNING_FIX' || status.state === 'APPLYING_PATCH') && (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>{status.message || 'AI is working...'}</span>
            </div>
          )}

          {/* Version History (when in error state) */}
          {status.state === 'ERROR_DETECTED' && versionHistory.length > 0 && onRestoreVersion && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <span>🕒</span>
                <span>Version History ({versionHistory.length})</span>
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {versionHistory.slice().reverse().slice(0, 5).map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      onRestoreVersion(version.id);
                      onCancel();
                    }}
                    className="w-full text-left p-3 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                      {version.error && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      {version.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-gray-800 bg-gray-900/50">
          <div className="flex flex-col gap-3">
            {status.state === 'PLAN_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>✨</span>
                  <span>Start Building App</span>
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel & Edit Plan
                </button>
              </>
            )}

            {status.state === 'ERROR_DETECTED' && (
              <>
                <button 
                  onClick={onConfirm}
                  disabled={status.fixAttempt && status.fixAttempt >= 3}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🔧</span>
                  <span>
                    {status.fixAttempt && status.fixAttempt >= 3 
                      ? 'Max Attempts Reached' 
                      : 'Generate Auto-Fix'}
                  </span>
                </button>
                {status.fixAttempt && status.fixAttempt >= 3 ? (
                  <div className="text-center text-sm text-gray-400 py-2">
                    Please review the code manually or try a different approach
                  </div>
                ) : (
                  <button 
                    onClick={onCancel}
                    className="w-full py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Dismiss & Review Code
                  </button>
                )}
              </>
            )}

            {status.state === 'FIX_READY' && (
              <>
                <button 
                  onClick={onConfirm}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 text-white py-3.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>✅</span>
                  <span>Apply Fix & Re-Test</span>
                </button>
                <button 
                  onClick={onCancel}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel & Review Fix
                </button>
              </>
            )}

            {(status.state === 'CODING' || status.state === 'VERIFYING' || status.state === 'APPLYING_PATCH') && (
              <div className="text-center text-sm text-gray-400 py-2 flex items-center justify-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>{status.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
