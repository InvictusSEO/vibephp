import React, { useEffect, useRef, useState } from 'react';
import type { File } from '../types';

// Your actual hosting URL
const EXECUTOR_URL = 'https://streamingsites.eu.org/phpvibe-executor/index.php';

interface PreviewFrameProps {
  files: File[];
}

// Generate and persist session ID across component renders
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('vibephp_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('vibephp_session_id', sessionId);
  }
  return sessionId;
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(getSessionId());

  useEffect(() => {
    const timer = setTimeout(() => setKey(prev => prev + 1), 500);
    return () => clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    const runPreview = async () => {
      const entryFile = files.find(f => f.path === 'index.php' || f.path === 'index.html');
      if (!iframeRef.current || !entryFile) return;

      const doc = iframeRef.current.contentDocument;
      if (!doc) return;

      // Static HTML
      if (entryFile.path.endsWith('.html')) {
        doc.open();
        doc.write(processStaticHtml(entryFile.content, files));
        doc.close();
        return;
      }

      // PHP with persistent database
      setIsLoading(true);

      try {
        console.log('[VibePHP] Executing PHP with session:', sessionId);
        
        const response = await fetch(EXECUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId // Send session ID for persistent database
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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Execution failed');
        }

        let output = result.output;

        if (!output || output.trim().length === 0) {
          output = `
            <div style="padding: 40px; text-align: center; font-family: system-ui;">
              <h2 style="color: #667eea;">✨ VibePHP</h2>
              <p style="color: #666;">PHP executed successfully, but no output was generated.</p>
              ${result.database.exists ? 
                `<p style="color: #10b981; font-size: 14px; margin-top: 20px;">
                  ✓ ${result.database.type || 'MySQL'} database connected 
                  ${result.database.tables ? `(${result.database.tables} tables)` : 
                    result.database.size ? `(${(result.database.size / 1024).toFixed(1)} KB)` : ''}
                </p>` : ''}
            </div>
          `;
        }

        // Log database status
        if (result.database) {
          console.log('[VibePHP] Database:', result.database);
        }

        // Inject CSS
        const cssFiles = files.filter(f => f.path.endsWith('.css'));
        cssFiles.forEach(cssFile => {
          const style = `<style>${cssFile.content}</style>`;
          if (output.includes('</head>')) {
            output = output.replace('</head>', style + '</head>');
          } else if (output.includes('<head>')) {
            output = output.replace('<head>', '<head>' + style);
          } else {
            output = style + output;
          }
        });

        // Inject JS
        const jsFiles = files.filter(f => f.path.endsWith('.js'));
        jsFiles.forEach(jsFile => {
          const script = `<script>${jsFile.content}</script>`;
          if (output.includes('</body>')) {
            output = output.replace('</body>', script + '</body>');
          } else {
            output += script;
          }
        });

        doc.open();
        doc.write(output);
        doc.close();

        console.log('[VibePHP] ✅ Success! Execution time:', result.executionTime, 's');

      } catch (err: any) {
        console.error('[VibePHP] Error:', err);

        const errorHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .error-box {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              }
              h2 {
                color: #dc2626;
                font-size: 28px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .error-msg {
                background: #fef2f2;
                border-left: 4px solid #dc2626;
                padding: 20px;
                border-radius: 10px;
                color: #991b1b;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                margin: 20px 0;
                word-break: break-word;
                line-height: 1.6;
              }
              .info {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                border-radius: 8px;
                font-size: 14px;
                color: #1e40af;
                line-height: 1.6;
              }
              .info strong { display: block; margin-bottom: 8px; }
              ul { margin: 10px 0 0 20px; }
              li { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h2><span style="font-size: 40px;">⚠️</span> Preview Error</h2>
              <div class="error-msg">${err.message}</div>
              <div class="info">
                <strong>💡 This preview uses your self-hosted backend with:</strong>
                <ul>
                  <li>Full PHP 8.x support</li>
                  <li>Real MySQL database (persistent)</li>
                  <li>Professional server-side execution</li>
                </ul>
                <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">
                  Session ID: ${sessionId}
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        doc.open();
        doc.write(errorHtml);
        doc.close();
      } finally {
        setIsLoading(false);
      }
    };

    runPreview();
  }, [key, sessionId]);

  return (
    <div className="w-full h-full relative bg-white">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="inline-block w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-xl font-bold mb-2">Executing PHP...</p>
            <p className="text-sm opacity-90">Full PHP + MySQL on your server</p>
            <p className="text-xs opacity-70 mt-2">Session: {sessionId.substring(0, 20)}...</p>
          </div>
        </div>
      )}
      
      <iframe 
        key={key}
        ref={iframeRef}
        title="App Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

function processStaticHtml(html: string, files: File[]): string {
  let content = html;
  
  files.filter(f => f.path.endsWith('.css')).forEach(f => {
    const regex = new RegExp(`<link[^>]*href=["']${f.path}["'][^>]*>`, 'g');
    const style = `<style>${f.content}</style>`;
    content = content.match(regex) ? content.replace(regex, style) : 
              content.includes('</head>') ? content.replace('</head>', style + '</head>') :
              style + content;
  });

  files.filter(f => f.path.endsWith('.js')).forEach(f => {
    const regex = new RegExp(`<script[^>]*src=["']${f.path}["'][^>]*><\\/script>`, 'g');
    const script = `<script>${f.content}</script>`;
    content = content.match(regex) ? content.replace(regex, script) : content + script;
  });

  return content;
}

export default PreviewFrame;
