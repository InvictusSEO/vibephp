  import React, { useEffect, useState, useRef } from 'react';
import type { File } from '../types';

// Your hosting URL
const EXECUTOR_URL = 'https://streamingsites.eu.org/phpvibe-executor/index.php';

interface PreviewFrameProps {
  files: File[];
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistent session ID
  const sessionId = useRef('sess_' + Math.random().toString(36).substr(2, 9)).current;

  useEffect(() => {
    // Debounce to prevent too many deployments while typing/generating
    const timer = setTimeout(() => {
      deployCode();
    }, 1000);

    return () => clearTimeout(timer);
  }, [files]);

  const deployCode = async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Send files to PHP server
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

      if (!response.ok) throw new Error(`Deploy failed: ${response.statusText}`);
      
      const result = await response.json();
      
      if (!result.success) throw new Error(result.error || 'Unknown error');

      // 2. Set the URL (this enables forms and relative links to work)
      // Add a timestamp to force iframe refresh
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
        <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 font-mono truncate ml-2">
          {isLoading ? 'Deploying...' : (iframeUrl || 'Waiting for code...')}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Deploying to Server...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-8 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block border border-red-200">
              <h3 className="font-bold mb-1">Deployment Failed</h3>
              <p>{error}</p>
            </div>
          </div>
        ) : iframeUrl ? (
          <iframe 
            src={iframeUrl}
            className="w-full h-full border-none"
            title="App Preview"
            // Important permissions for PHP forms/scripts
            sandbox="allow-forms allow-scripts allow-same-origin allow-modals allow-popups"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Generating code...
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFrame;
