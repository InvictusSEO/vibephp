import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { File } from '../types';

// Your backend URL
const EXECUTOR_URL = 'https://streamingsites.eu.org/phpvibe-executor/index.php';

interface PreviewFrameProps {
  files: File[];
  isMobile?: boolean;
}

// Helper: Get or create a persistent Session ID
const getSessionId = () => {
  const STORAGE_KEY = 'vibephp_session_id';
  let id = sessionStorage.getItem(STORAGE_KEY);
  
  if (!id) {
    const timestamp = Date.now().toString(36);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36))
      .join('');
    id = `sess_${timestamp}_${random}`;
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  
  return id;
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files, isMobile = false }) => {
  const [sessionId] = useState(getSessionId());
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const lastDeployedFiles = useRef<string>('');

  const deployCode = useCallback(async () => {
    if (files.length === 0) {
      setDeployStatus('idle');
      setIframeUrl(null);
      setIframeLoaded(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeployStatus('deploying');
    setIframeLoaded(false);

    try {
      console.log(`[VibePHP] Deploying to session: ${sessionId}`);

      const response = await fetch(EXECUTOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          files: files.map(f => ({
            path: f.path,
            content: f.content
          })),
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Deployment failed');
      }

      // Force iframe reload with new timestamp
      const newUrl = `${result.url}?t=${Date.now()}&v=${Math.random().toString(36).substr(2, 9)}`;
      setIframeUrl(newUrl);
      setDeployStatus('success');
      setError(null);

    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message);
      setDeployStatus('error');
      setIframeUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [files, sessionId]);

  // Deploy when files change (with debounce)
  useEffect(() => {
    const filesFingerprint = JSON.stringify(files.map(f => ({ p: f.path, c: f.content })));
    
    if (filesFingerprint === lastDeployedFiles.current) return;
    
    const timer = setTimeout(() => {
      lastDeployedFiles.current = filesFingerprint;
      deployCode();
    }, 1000);

    return () => clearTimeout(timer);
  }, [files, deployCode]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    console.log('[VibePHP] Iframe loaded successfully');
    
    // Try to inject a fix for iframe height issues
    setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const iframeDoc = iframeRef.current.contentWindow.document;
          if (iframeDoc && iframeDoc.body) {
            // Ensure iframe body has proper height
            iframeDoc.body.style.minHeight = '100vh';
            iframeDoc.body.style.height = 'auto';
            iframeDoc.documentElement.style.height = '100%';
            iframeDoc.body.style.display = 'flex';
            iframeDoc.body.style.flexDirection = 'column';
          }
        } catch (e) {
          // Cross-origin iframe, can't access document
        }
      }
    }, 100);
  };

  const getStatusColor = () => {
    switch (deployStatus) {
      case 'deploying': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (deployStatus) {
      case 'deploying': return 'fas fa-sync-alt animate-spin';
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      default: return 'fas fa-cloud';
    }
  };

  const handleRefresh = () => {
    if (iframeUrl) {
      const url = new URL(iframeUrl);
      url.searchParams.set('t', Date.now().toString());
      url.searchParams.set('v', Math.random().toString(36).substr(2, 9));
      setIframeUrl(url.toString());
      setIframeLoaded(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* Preview Header */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0 shadow-sm">
        {/* Window controls for desktop */}
        {!isMobile && (
          <div className="flex gap-1.5 mr-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>
        )}
        
        {/* URL/Status Bar */}
        <div className={`flex-1 flex items-center ${isMobile ? 'bg-gray-100' : 'bg-gray-50'} rounded-lg px-3 py-2 min-w-0 transition-colors duration-200`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <i className={`${getStatusIcon()} ${getStatusColor()} text-sm shrink-0`}></i>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-600 truncate font-mono" title={iframeUrl || ''}>
                {isLoading ? '🔄 Deploying...' : 
                 iframeUrl ? '✅ App deployed' : 
                 files.length > 0 ? '📦 Ready to deploy' : '📝 No app generated'}
              </div>
              {isMobile && iframeUrl && (
                <div className="text-[10px] text-gray-400 truncate">
                  Tap to open
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            {iframeUrl && (
              <>
                <button 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={`p-1.5 ${isMobile ? 'text-gray-600' : 'text-gray-500'} hover:text-gray-800 transition-colors rounded-lg touch-target disabled:opacity-50`}
                  title="Refresh Preview"
                >
                  <i className="fas fa-redo text-sm"></i>
                </button>
                <button 
                  onClick={handleOpenInNewTab}
                  className={`p-1.5 ${isMobile ? 'text-blue-600' : 'text-blue-500'} hover:text-blue-700 transition-colors rounded-lg touch-target`}
                  title="Open in New Tab"
                >
                  <i className="fas fa-external-link-alt text-sm"></i>
                </button>
              </>
            )}
            
            <button 
              onClick={deployCode}
              disabled={isLoading || files.length === 0}
              className={`p-1.5 ${isMobile ? 'text-green-600' : 'text-green-500'} hover:text-green-700 transition-colors rounded-lg touch-target disabled:opacity-50`}
              title="Deploy Again"
            >
              <i className="fas fa-cloud-upload-alt text-sm"></i>
            </button>
          </div>
        </div>
        
        {/* Session info for desktop */}
        {!isMobile && (
          <div className="ml-3 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            {sessionId.substring(0, 8)}...
          </div>
        )}
      </div>

      {/* Main Content Area - Takes ALL remaining space */}
      <div className="flex-1 relative w-full overflow-hidden bg-white">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <div className="text-center max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Deploying Your App</h3>
              <p className="text-gray-600 text-sm mb-4">
                Building PHP application on our servers. This usually takes 5-10 seconds.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                <i className="fas fa-server"></i>
                <span>Session: {sessionId.substring(0, 12)}...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-white">
            <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-lg p-6 animate-fade-in">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-red-700 text-lg">Deployment Failed</h3>
                  <p className="text-red-600 text-sm">Could not deploy your application</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                <div className="text-sm text-red-800 font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {error}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={deployCode}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-redo"></i> Try Again
                </button>
                {isMobile && (
                  <button 
                    onClick={() => setError(null)}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Iframe Container - Takes FULL height */}
        {iframeUrl && !isLoading && !error && (
          <div className="absolute inset-0 w-full h-full bg-white">
            {/* Loading indicator for iframe */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10 bg-white flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-gray-600 text-sm">Loading app preview...</p>
                </div>
              </div>
            )}
            
            {/* The actual iframe */}
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className={`absolute inset-0 w-full h-full border-0 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
              title="Live App Preview"
              sandbox="allow-forms allow-scripts allow-same-origin allow-modals allow-popups allow-presentation"
              allow="accelerometer; camera; encrypted-media; geolography; gyroscope; microphone; midi; payment"
              onLoad={handleIframeLoad}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '100%',
                display: 'block'
              }}
            />
            
            {/* Mobile floating controls */}
            {isMobile && iframeLoaded && (
              <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3">
                <button
                  onClick={handleRefresh}
                  className="w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all active:scale-95 touch-target"
                  style={{
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <i className="fas fa-redo text-lg"></i>
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-500 shadow-xl rounded-full flex items-center justify-center text-white hover:opacity-90 transition-all active:scale-95 touch-target"
                  style={{
                    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <i className="fas fa-external-link-alt text-lg"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State - No files yet */}
        {!iframeUrl && !isLoading && !error && files.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
              <i className="fas fa-rocket text-4xl text-gray-400"></i>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-3">App Preview</h3>
            <p className="text-gray-600 text-center max-w-sm mb-8">
              Describe your app idea in the chat, and the AI will generate it here in real-time.
            </p>
            
            <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-sm w-full shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-lightbulb text-blue-500"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">How to get started</h4>
                  <p className="text-sm text-gray-600">
                    1. Switch to Chat tab<br/>
                    2. Describe your app idea<br/>
                    3. AI will generate the code<br/>
                    4. Preview appears here
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <i className="fas fa-bolt text-yellow-500"></i>
                <span>Instant Preview</span>
              </span>
              <span className="flex items-center gap-2">
                <i className="fas fa-database text-green-500"></i>
                <span>MySQL Database</span>
              </span>
              <span className="flex items-center gap-2">
                <i className="fas fa-mobile-alt text-blue-500"></i>
                <span>Responsive</span>
              </span>
            </div>
          </div>
        )}

        {/* Empty State - Files ready but not deployed */}
        {!iframeUrl && !isLoading && !error && files.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <i className="fas fa-code text-3xl text-gray-500"></i>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Deploy</h3>
            <p className="text-gray-600 text-center max-w-sm mb-6">
              Your app has been generated! It will automatically deploy in a moment...
            </p>
            
            <div className="inline-flex items-center gap-2 text-sm text-gray-700 bg-gray-100 px-4 py-2 rounded-lg mb-8">
              <i className="fas fa-file-code"></i>
              <span>{files.length} file{files.length !== 1 ? 's' : ''} generated</span>
            </div>
            
            <button 
              onClick={deployCode}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <i className="fas fa-play"></i>
              Deploy Now
            </button>
          </div>
        )}
      </div>

      {/* Status Footer */}
      {!isMobile && (
        <div className="h-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between px-4 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <i className="fas fa-shield-alt text-gray-400"></i>
              <span>Sandboxed Environment</span>
            </span>
            <span className="flex items-center gap-1">
              <i className="fas fa-database text-gray-400"></i>
              <span>Session: {sessionId.substring(0, 16)}...</span>
            </span>
          </div>
          <div>
            {deployStatus === 'success' && (
              <span className="flex items-center gap-1 text-green-600">
                <i className="fas fa-check-circle"></i>
                <span>Live</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewFrame;
