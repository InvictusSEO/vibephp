import React, { useEffect, useState, useRef } from 'react';
import type { File } from '../types';

// Your backend URL
const EXECUTOR_URL = 'https://streamingsites.eu.org/phpvibe-executor/index.php';

interface PreviewFrameProps {
  files: File[];
}

// Helper: Get or create a persistent Session ID
const getSessionId = () => {
  const STORAGE_KEY = 'vibephp_session_id';
  let id = sessionStorage.getItem(STORAGE_KEY);
  
  if (!id) {
    // More secure generation: timestamp + crypto random
    const timestamp = Date.now().toString(36);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(36))
      .join('');
    id = `sess_${timestamp}_${random}`;
    sessionStorage.setItem(STORAGE_KEY, id);
    console.log('[VibePHP] Created new session:', id);
  }
  
  return id;
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const [sessionId] = useState(getSessionId());
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastDeployedFiles = useRef<string>('');

  useEffect(() => {
    const filesFingerprint = JSON.stringify(files.map(f => ({ p: f.path, c: f.content })));
    
    if (filesFingerprint === lastDeployedFiles.current) return;
    
    const timer = setTimeout(() => {
      lastDeployedFiles.current = filesFingerprint;
      deployCode();
    }, 1000);

    return () => clearTimeout(timer);
  }, [files, sessionId]);

  const deployCode = async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);

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

      if (!response.ok) throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      
      const result = await response.json();
      
      if (!result.success) throw new Error(result.error || 'Deployment failed');

      setIframeUrl(`${result.url}?t=${Date.now()}`);

    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-gray-50 flex flex-col">
      {/* Address Bar */}
      <div className="h-10 border-b border-gray-200 bg-white flex items-center px-4 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        
        {/* URL Display */}
        <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 font-mono truncate ml-2 flex justify-between items-center">
          <span>{isLoading ? 'Deploying...' : (iframeUrl || 'Waiting for code...')}</span>
          <span className="text-gray-300 text-[10px] hidden sm:inline">Session: {sessionId}</span>
        </div>

        {/* Refresh Button */}
        {iframeUrl && (
          <button 
            onClick={() => {
              const url = new URL(iframeUrl);
              url.searchParams.set('t', Date.now().toString());
              setIframeUrl(url.toString());
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-400"
            title="Reload Frame"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative w-full h-full bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium animate-pulse">Deploying to server...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 max-w-md shadow-lg">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Deployment Failed
              </h3>
              <p className="text-sm opacity-90">{error}</p>
              <button 
                onClick={() => { lastDeployedFiles.current = ''; deployCode(); }}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : iframeUrl ? (
          <iframe 
            src={iframeUrl}
            className="w-full h-full border-none"
            title="App Preview"
            sandbox="allow-forms allow-scripts allow-same-origin allow-modals allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <p>Ready to deploy your PHP code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFrame;
