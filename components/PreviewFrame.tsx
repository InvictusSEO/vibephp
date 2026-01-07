import React, { useEffect, useRef, useState } from 'react';
import type { File } from '../types';
import { getBootloaderScript } from '../services/phpRuntime';

interface PreviewFrameProps {
  files: File[];
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Debounce to prevent flickering
    const timer = setTimeout(() => {
      setKey(prev => prev + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    const entryFile = files.find(f => f.path === 'index.php' || f.path === 'index.html');
    if (!iframeRef.current || !entryFile) {
      console.warn('[PreviewFrame] No iframe ref or entry file');
      return;
    }

    const doc = iframeRef.current.contentDocument;
    if (!doc) {
      console.warn('[PreviewFrame] No content document');
      return;
    }

    console.log('[PreviewFrame] Building iframe HTML for:', entryFile.path);
    const html = buildIframeHtml(files, entryFile);

    doc.open();
    doc.write(html);
    doc.close();
  }, [key]);

  return (
    <div className="w-full h-full relative bg-white">
      <iframe 
        key={key}
        ref={iframeRef}
        title="App Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
      />
    </div>
  );
};

function buildIframeHtml(files: File[], entryFile: File): string {
  // Pure HTML mode (fast path)
  if (entryFile.path.endsWith('.html')) {
    return processStaticHtml(entryFile.content, files);
  }

  // PHP Mode - Enhanced with beautiful loading UI
  const scriptContent = getBootloaderScript(JSON.stringify(files), entryFile.path);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            overflow: hidden;
        }
        
        #loader {
            position: fixed; 
            inset: 0; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 999;
            color: white;
            padding: 2rem;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
            color: #667eea;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .loader-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .loader-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-bottom: 3rem;
        }
        
        .progress-container {
            width: 100%;
            max-width: 500px;
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .progress-bar-bg {
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.3);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 1rem;
            position: relative;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #fff 0%, #e0e0e0 100%);
            border-radius: 4px;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
            position: relative;
        }
        
        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
            animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        .status-text {
            font-size: 0.95rem;
            font-weight: 500;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .status-icon {
            width: 20px;
            height: 20px;
            border: 2px solid white;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin { 
            to { transform: rotate(360deg); } 
        }
        
        .steps-container {
            margin-top: 1.5rem;
            text-align: left;
            font-size: 0.85rem;
            opacity: 0.8;
        }
        
        .step {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem 0;
            transition: opacity 0.3s;
        }
        
        .step.completed {
            opacity: 0.6;
        }
        
        .step.active {
            opacity: 1;
            font-weight: 600;
        }
        
        .step-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            flex-shrink: 0;
        }
        
        .step-icon.completed {
            background: rgba(255,255,255,0.9);
            color: #667eea;
        }
        
        .step-icon.active {
            background: rgba(255,255,255,0.3);
            border: 2px solid white;
        }
        
        .step-icon.pending {
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        #error-log {
            position: fixed;
            inset: 0;
            background: white;
            color: #dc2626;
            padding: 2rem;
            display: none;
            overflow: auto;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        #error-log h3 {
            color: #991b1b;
            font-size: 1.5rem;
            margin-bottom: 1rem;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .error-icon {
            width: 32px;
            height: 32px;
            background: #fecaca;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        #error-log pre {
            background: #fef2f2;
            padding: 1.5rem;
            border-radius: 0.5rem;
            border-left: 4px solid #dc2626;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            line-height: 1.6;
        }
        
        .error-actions {
            margin-top: 1.5rem;
            display: flex;
            gap: 1rem;
        }
        
        .error-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        
        .error-btn-primary {
            background: #dc2626;
            color: white;
        }
        
        .error-btn-primary:hover {
            background: #b91c1c;
        }
        
        .error-btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        .error-btn-secondary:hover {
            background: #e5e7eb;
        }
    </style>
</head>
<body>
    <div id="loader">
        <div class="logo">V</div>
        <div class="loader-title">VibePHP</div>
        <div class="loader-subtitle">Booting PHP Environment</div>
        
        <div class="progress-container">
            <div class="status-text">
                <div class="status-icon"></div>
                <span id="loader-text">Initializing...</span>
            </div>
            
            <div class="progress-bar-bg">
                <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
            </div>
            
            <div class="steps-container">
                <div class="step pending" id="step-1">
                    <div class="step-icon pending">1</div>
                    <span>Loading PHP from CDN</span>
                </div>
                <div class="step pending" id="step-2">
                    <div class="step-icon pending">2</div>
                    <span>Initializing Runtime</span>
                </div>
                <div class="step pending" id="step-3">
                    <div class="step-icon pending">3</div>
                    <span>Creating Virtual Filesystem</span>
                </div>
                <div class="step pending" id="step-4">
                    <div class="step-icon pending">4</div>
                    <span>Mounting Files</span>
                </div>
                <div class="step pending" id="step-5">
                    <div class="step-icon pending">5</div>
                    <span>Executing PHP Script</span>
                </div>
                <div class="step pending" id="step-6">
                    <div class="step-icon pending">6</div>
                    <span>Rendering Output</span>
                </div>
            </div>
        </div>
    </div>
    
    <div id="error-log">
        <h3>
            <span class="error-icon">⚠️</span>
            Error Loading Preview
        </h3>
        <pre id="error-content"></pre>
        <div class="error-actions">
            <button class="error-btn error-btn-primary" onclick="location.reload()">Reload Preview</button>
            <button class="error-btn error-btn-secondary" onclick="console.log(document.getElementById('error-content').textContent)">Copy Error to Console</button>
        </div>
    </div>
    
    <script type="module">
      ${scriptContent}
    </script>
</body>
</html>`;
}

// Fallback for non-PHP projects (HTML/JS/CSS only)
function processStaticHtml(html: string, files: File[]): string {
  let content = html;
  
  // Inject CSS
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  cssFiles.forEach(cssFile => {
    const linkRegex = new RegExp(`<link[^>]*href=["']${cssFile.path}["'][^>]*>`, 'g');
    if (content.match(linkRegex)) {
      content = content.replace(linkRegex, `<style>${cssFile.content}</style>`);
    } else {
      if (content.includes('</head>')) {
        content = content.replace('</head>', `<style>${cssFile.content}</style></head>`);
      } else {
        content = `<style>${cssFile.content}</style>` + content;
      }
    }
  });

  // Inject JS
  const jsFiles = files.filter(f => f.path.endsWith('.js'));
  jsFiles.forEach(jsFile => {
    const scriptRegex = new RegExp(`<script[^>]*src=["']${jsFile.path}["'][^>]*><\/script>`, 'g');
    if (content.match(scriptRegex)) {
      content = content.replace(scriptRegex, `<script>${jsFile.content}</script>`);
    } else {
      content += `<script>${jsFile.content}</script>`;
    }
  });

  return content;
}

export default PreviewFrame;