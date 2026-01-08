import React, { useEffect, useState, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const lastDeployedFiles = useRef<string>('');

  useEffect(() => {
    const filesFingerprint = JSON.stringify(files.map(f => ({ p: f.path, c: f.content })));
    
    if (filesFingerprint === lastDeployedFiles.current) return;
    
    const timer = setTimeout(() => {
      lastDeployedFiles.current = filesFingerprint;
      deployCode();
    }, 1500);

    return () => clearTimeout(timer);
  }, [files, sessionId]);

  const deployCode = async () => {
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

      setIframeUrl(`${result.url}?t=${Date.now()}`);
      setDeployStatus('success');
      setError(null);

    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message);
      setDeployStatus('error');
      setIframeLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    console.log('[VibePHP] Iframe loaded successfully');
    
    // Adjust iframe content to be responsive
    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // Inject responsive meta tag into iframe
          const meta = iframe.contentDocument?.createElement('meta');
          if (meta) {
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            iframe.contentDocument?.head.appendChild(meta);
          }
          
          // Make sure body takes full height
          if (iframe.contentDocument?.body) {
            iframe.contentDocument.body.style.minHeight = '100vh';
            iframe.contentDocument.body.style.display = 'flex';
            iframe.contentDocument.body.style.flexDirection = 'column';
          }
        }
      } catch (e) {
        console.log('[VibePHP] Could not inject responsive meta tag (cross-origin)');
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
      case 'deploying': return '↻';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '☁';
    }
  };

  // Handle iframe resizing on window resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger iframe reload to recalc dimensions
      if (iframeUrl && iframeRef.current) {
        const url = new URL(iframeRef.current.src);
        url.searchParams.set('resize', Date.now().toString());
        iframeRef.current.src = url.toString();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [iframeUrl]);

  return (
    <div className="w-full h-full flex flex-col bg-white" ref={containerRef}>
      {/* Preview Header */}
      <div className={`${isMobile ? 'h-12' : 'h-10'} border-b border-gray-200 bg-white flex items-center px-3 sm:px-4 gap-2 shrink-0`}>
        {/* Window controls - Desktop only */}
        {!isMobile && (
          <div className="flex gap-1.5 mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
        )}
        
        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-1.5 min-w-0">
          <span className={`${getStatusColor()} mr-2 text-sm`}>{getStatusIcon()}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 truncate font-mono">
              {isLoading ? 'Deploying...' : (iframeUrl ? 'Preview' : 'No app deployed')}
            </div>
            {isMobile && iframeUrl && (
              <div className="text-[10px] text-gray-400 truncate">
                Tap to open full screen
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            {iframeUrl && (
              <>
                <button 
                  onClick={() => {
                    if (iframeRef.current) {
                      const url = new URL(iframeRef.current.src);
                      url.searchParams.set('t', Date.now().toString());
                      iframeRef.current.src = url.toString();
                      setIframeLoaded(false);
                    }
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Reload"
                >
                  <span className="text-sm">↻</span>
                </button>
                <a 
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Open in new tab"
                >
                  <span className="text-sm">↗</span>
                </a>
              </>
            )}
            
            <button 
              onClick={deployCode}
              disabled={isLoading || files.length === 0}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              title="Deploy again"
            >
              <span className="text-sm">↑</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Takes full remaining space */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-white flex items-center justify-center flex-col p-6">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700 font-medium mb-2">Deploying your app...</p>
            <p className="text-gray-500 text-sm text-center max-w-xs">
              Building PHP application on the server
            </p>
            <div className="mt-6 text-xs text-gray-400 font-mono bg-gray-100 p-2 rounded">
              {sessionId}
            </div>
          </div>
        )}

        {error ? (
          <div className="h-full flex items-center justify-center p-4 sm:p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-500 font-bold">!</span>
                </div>
                <div>
                  <h3 className="font-semibold text-red-700">Deployment Failed</h3>
                  <p className="text-sm text-red-600">Could not deploy your app</p>
                </div>
              </div>
              
              <div className="bg-red-100/50 p-3 rounded-lg mb-4">
                <p className="text-sm text-red-800 font-mono break-all">{error}</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => { lastDeployedFiles.current = ''; deployCode(); }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  Try Again
                </button>
                {isMobile && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    ↻
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : iframeUrl ? (
          <>
            {/* Loading overlay for iframe */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading app preview...</p>
                </div>
              </div>
            )}
            
            {/* Responsive iframe container */}
            <div className="absolute inset-0 w-full h-full overflow-auto bg-white">
              <div className="min-w-full min-h-full flex items-start justify-center">
                <iframe 
                  ref={iframeRef}
                  src={iframeUrl}
                  className="w-full min-h-full border-none"
                  title="App Preview"
                  sandbox="allow-forms allow-scripts allow-same-origin allow-modals allow-popups"
                  allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment"
                  style={{
                    // Force full height and responsive width
                    minHeight: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                  onLoad={handleIframeLoad}
                  // Allow iframe to take full space
                  loading="eager"
                />
              </div>
            </div>
            
            {/* Mobile floating controls */}
            {isMobile && iframeLoaded && (
              <>
                <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (iframeRef.current) {
                        const url = new URL(iframeRef.current.src);
                        url.searchParams.set('t', Date.now().toString());
                        iframeRef.current.src = url.toString();
                        setIframeLoaded(false);
                      }
                    }}
                    className="w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50"
                  >
                    <span>↻</span>
                  </button>
                  <a
                    href={iframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-blue-600 shadow-lg rounded-full flex items-center justify-center text-white hover:bg-blue-700"
                  >
                    <span>↗</span>
                  </a>
                </div>
                
                {/* Hint for mobile users */}
                <div className="fixed bottom-4 left-4 z-20 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
                  Scroll to see full app
                </div>
              </>
            )}
            
            {/* Desktop hint */}
            {!isMobile && iframeLoaded && (
              <div className="absolute bottom-2 right-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-70">
                Scroll if content is cut off
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl text-gray-300">🚀</span>
            </div>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">App Preview</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
              {files.length > 0 
                ? 'Your app will appear here once deployed'
                : 'Describe your app idea to generate and preview it here'}
            </p>
            
            {files.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-sm">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-500 mt-1">💡</span>
                  <div>
                    <p className="text-sm text-gray-700 font-medium mb-1">Get started</p>
                    <p className="text-xs text-gray-600">
                      Switch to the chat tab and describe what you want to build
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 text-xs text-gray-500 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span>⚡</span>
                <span>PHP + MySQL</span>
              </span>
              <span className="flex items-center gap-1">
                <span>🛡️</span>
                <span>Sandboxed</span>
              </span>
              <span className="flex items-center gap-1">
                <span>📱</span>
                <span>Responsive</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between px-3 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {iframeUrl && (
            <span className="flex items-center gap-1">
              <span>🌐</span>
              <span>Live Preview</span>
            </span>
          )}
          <span>Session: {sessionId.substring(0, 8)}...</span>
        </div>
        <div>
          {isMobile ? 'Mobile View' : 'Desktop View'}
        </div>
      </div>
    </div>
  );
};

export default PreviewFrame;
