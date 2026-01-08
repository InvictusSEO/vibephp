import React, { useEffect, useRef, useState } from 'react';
import type { File } from '../types';

interface PreviewFrameProps {
  files: File[];
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ files }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKey(prev => prev + 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    const entryFile = files.find(f => f.path === 'index.php' || f.path === 'index.html');
    if (!iframeRef.current || !entryFile) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Static HTML - render directly
    if (entryFile.path.endsWith('.html')) {
      const html = processStaticHtml(entryFile.content, files);
      doc.open();
      doc.write(html);
      doc.close();
      return;
    }

    // PHP - use simplified WASM loader
    const html = buildSimplePHPRunner(files);
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
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

function buildSimplePHPRunner(files: File[]): string {
  const filesJson = JSON.stringify(files);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; font-family: system-ui; }
    #loader {
      position: fixed; inset: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: white; gap: 20px;
    }
    .spinner {
      width: 50px; height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #status { font-size: 14px; opacity: 0.9; }
    #error {
      display: none; position: fixed; inset: 20px;
      background: white; color: #dc2626;
      padding: 20px; border-radius: 12px;
      border: 2px solid #fecaca;
      overflow: auto; z-index: 100;
    }
  </style>
</head>
<body>
  <div id="loader">
    <div class="spinner"></div>
    <div>Loading PHP...</div>
    <div id="status">Initializing...</div>
  </div>
  <div id="error"></div>

  <script type="module">
    const files = ${filesJson};
    const status = document.getElementById('status');
    const loader = document.getElementById('loader');
    const errorDiv = document.getElementById('error');

    function showError(msg) {
      loader.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.innerHTML = '<h2>Error</h2><pre>' + msg + '</pre>';
    }

    async function run() {
      try {
        status.textContent = 'Loading PHP runtime...';
        
        // Import PHP - use specific stable version
        const { PHP } = await import('https://playground.wordpress.net/client/index.js');
        
        status.textContent = 'Starting PHP 8.0...';
        
        // Initialize with minimal config
        const php = await PHP.load('8.0', {
          requestHandler: {
            documentRoot: '/wordpress'
          }
        });

        status.textContent = 'Creating files...';
        
        // Create directory and write files
        php.mkdirTree('/wordpress');
        
        for (const file of files) {
          php.writeFile('/wordpress/' + file.path, file.content);
        }

        status.textContent = 'Running PHP...';
        
        // Execute PHP
        const result = await php.run({
          code: '<?php chdir("/wordpress"); require "index.php"; ?>'
        });

        let output = await result.text;
        
        // Inject CSS
        for (const file of files) {
          if (file.path.endsWith('.css')) {
            const style = '<style>' + file.content + '</style>';
            if (output.includes('</head>')) {
              output = output.replace('</head>', style + '</head>');
            } else {
              output = style + output;
            }
          }
        }

        // Inject JS
        for (const file of files) {
          if (file.path.endsWith('.js')) {
            const script = '<script>' + file.content + '</script>';
            output = output + script;
          }
        }

        // Hide loader and show output
        loader.style.display = 'none';
        document.body.innerHTML = output;

      } catch (err) {
        console.error(err);
        showError(err.message + '\\n\\n' + (err.stack || ''));
      }
    }

    run();
  </script>
</body>
</html>`;
}

function processStaticHtml(html: string, files: File[]): string {
  let content = html;
  
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  cssFiles.forEach(cssFile => {
    const linkRegex = new RegExp(`<link[^>]*href=["']${cssFile.path}["'][^>]*>`, 'g');
    if (content.match(linkRegex)) {
      content = content.replace(linkRegex, `<style>${cssFile.content}</style>`);
    } else if (content.includes('</head>')) {
      content = content.replace('</head>', `<style>${cssFile.content}</style></head>`);
    } else {
      content = `<style>${cssFile.content}</style>` + content;
    }
  });

  const jsFiles = files.filter(f => f.path.endsWith('.js'));
  jsFiles.forEach(jsFile => {
    const scriptRegex = new RegExp(`<script[^>]*src=["']${jsFile.path}["'][^>]*><\\/script>`, 'g');
    if (content.match(scriptRegex)) {
      content = content.replace(scriptRegex, `<script>${jsFile.content}</script>`);
    } else {
      content += `<script>${jsFile.content}</script>`;
    }
  });

  return content;
}

export default PreviewFrame;
