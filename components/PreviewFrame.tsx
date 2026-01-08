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
    // More secure generation
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
      return;
    }

    setIsLoading(true);
    setError(null);
    setDeployStatus('deploying');

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
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Preview Header */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0">
        {/* Window controls */}
        {!isMobile && (
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        )}
        
        {/* URL Bar */}
        <div className="flex-1 flex items-center bg-gray-100 rounded-lg px-3 py-1.5 min-w-0">
          <i className={`${getStatusIcon()} ${getStatusColor()} mr-2 text-sm`}></i>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 truncate font-mono">
              {isLoading ? 'Deploying...' : (iframeUrl || 'No app deployed')}
            </div>
            {isMobile && (
              <div className="text-[10px] text-gray-400 truncate">
                Session: {sessionId.substring(0, 12)}...
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            {iframeUrl && (
              <>
                <button 
                  onClick={() => {
                    const url = new URL(iframeUrl);
                    url.searchParams.set('t', Date.now().toString());
                    setIframeUrl(url.toString());
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors touch-target"
                  title="Reload"
                >
                  <i className="fas fa-redo text-sm"></i>
                </button>
                <a 
                  href={iframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors touch-target"
                  title="Open in new tab"
                >
                  <i className="fas fa-external-link-alt text-sm"></i>
                </a>
              </>
            )}
            
            <button 
              onClick={deployCode}
              disabled={isLoading || files.length === 0}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors touch-target disabled:opacity-50"
              title="Deploy again"
            >
              <i className="fas fa-cloud-upload-alt text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col p-6">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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
          <div className="h-full flex items-center justify-center p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-500"></i>
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
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-redo"></i> Try Again
                </button>
                {isMobile && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <i className="fas fa-home"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : iframeUrl ? (
          <iframe 
            src={iframeUrl}
            className="w-full h-full border-none"
            title="App Preview"
            sandbox="allow-forms allow-scripts allow-same-origin allow-modals allow-popups"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-rocket text-3xl text-gray-300"></i>
            </div>
            
            <h3 className="text-lg font-medium text-gray-700 mb-2">App Preview</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm mb-6">
              {files.length > 0 
                ? 'Your app is being deployed...'
                : 'Describe your app idea to generate and preview it here'}
            </p>
            
            {files.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-sm">
                <div className="flex items-start gap-3">
                  <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
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
                <i className="fas fa-bolt"></i>
                <span>PHP + MySQL</span>
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-shield-alt"></i>
                <span>Sandboxed</span>
              </span>
              <span className="flex items-center gap-1">
                <i className="fas fa-cloud"></i>
                <span>Live Preview</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Preview Controls */}
      {isMobile && iframeUrl && (
        <div className="fixed bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => {
              const url = new URL(iframeUrl);
              url.searchParams.set('t', Date.now().toString());
              setIframeUrl(url.toString());
            }}
            className="w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors touch-target"
          >
            <i className="fas fa-redo"></i>
          </button>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-blue-600 shadow-lg rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors touch-target"
          >
            <i className="fas fa-external-link-alt"></i>
          </a>
        </div>
      )}
    </div>
  );
};

export default PreviewFrame;
