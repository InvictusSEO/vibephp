import type { File } from '../types';

/**
 * FIXED VERSION - Generates the bootloader script with visual progress updates
 */
export function getBootloaderScript(filesJson: string, entryPath: string): string {
  return `
    const files = ${filesJson};
    const entryPath = "${entryPath}";
    
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const errorLog = document.getElementById('error-log');
    const errorContent = document.getElementById('error-content');
    const progressBar = document.getElementById('progress-bar');
    
    let currentStep = 0;
    const totalSteps = 6;
    
    function updateProgress(step, text) {
        currentStep = step;
        const percentage = (step / totalSteps) * 100;
        
        // Update progress bar
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        
        // Update status text
        if (loaderText) {
            loaderText.textContent = text;
        }
        
        // Update step indicators
        for (let i = 1; i <= totalSteps; i++) {
            const stepEl = document.getElementById('step-' + i);
            const stepIcon = stepEl?.querySelector('.step-icon');
            
            if (i < step) {
                // Completed
                stepEl?.classList.remove('active', 'pending');
                stepEl?.classList.add('completed');
                stepIcon?.classList.remove('active', 'pending');
                stepIcon?.classList.add('completed');
                if (stepIcon) stepIcon.textContent = '✓';
            } else if (i === step) {
                // Active
                stepEl?.classList.remove('completed', 'pending');
                stepEl?.classList.add('active');
                stepIcon?.classList.remove('completed', 'pending');
                stepIcon?.classList.add('active');
                if (stepIcon) stepIcon.textContent = i;
            } else {
                // Pending
                stepEl?.classList.remove('active', 'completed');
                stepEl?.classList.add('pending');
                stepIcon?.classList.remove('active', 'completed');
                stepIcon?.classList.add('pending');
                if (stepIcon) stepIcon.textContent = i;
            }
        }
        
        console.log('[VibePHP] Step ' + step + '/' + totalSteps + ':', text);
    }

    function showError(msg) {
        console.error('[VibePHP Error]', msg);
        if (loader) loader.style.display = 'none';
        if (errorLog) errorLog.style.display = 'block';
        if (errorContent) errorContent.textContent = msg;
    }

    window.onerror = function(msg, url, line, col, error) {
        showError("Script Error: " + msg + "\\n\\nFile: " + url + "\\nLine: " + line + ":" + col + "\\n\\n" + (error ? error.stack : ''));
        return false;
    };

    window.addEventListener('unhandledrejection', function(event) {
        showError("Async Error: " + (event.reason?.message || event.reason) + "\\n\\n" + (event.reason?.stack || ''));
    });

    async function boot() {
        try {
            // STEP 1: Load PHP from CDN
            updateProgress(1, 'Loading PHP from CDN...');
            
            let PHP;
            const CDN_SOURCES = [
                'https://cdn.jsdelivr.net/npm/@php-wasm/web@0.9.10/index.js',
                'https://unpkg.com/@php-wasm/web@0.9.10/index.js'
            ];
            
            let lastError;
            for (let i = 0; i < CDN_SOURCES.length; i++) {
                try {
                    const cdn = CDN_SOURCES[i];
                    const cdnName = cdn.split('/')[2];
                    updateProgress(1, 'Trying ' + cdnName + '...');
                    
                    const module = await import(cdn);
                    PHP = module.PHP;
                    console.log('[VibePHP] Loaded PHP from:', cdn);
                    break;
                } catch (e) {
                    console.warn('[VibePHP] Failed CDN ' + (i + 1) + ':', e.message);
                    lastError = e;
                }
            }
            
            if (!PHP) {
                throw new Error(
                    'Failed to load PHP from all CDN sources.\\n\\n' +
                    'Last error: ' + (lastError?.message || 'Unknown') + '\\n\\n' +
                    'Possible causes:\\n' +
                    '• Internet connection issues\\n' +
                    '• CDN is blocked by firewall/proxy\\n' +
                    '• Browser compatibility issues\\n\\n' +
                    'Solutions:\\n' +
                    '• Check your internet connection\\n' +
                    '• Try a different network\\n' +
                    '• Use Chrome or Firefox browser\\n' +
                    '• Disable any ad blockers or VPN'
                );
            }
            
            // STEP 2: Initialize PHP Runtime
            updateProgress(2, 'Initializing PHP 8.3 runtime...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual feedback
            
            const php = await PHP.load('8.3', {
                requestHandler: {
                    documentRoot: '/www'
                }
            });
            
            console.log('[VibePHP] PHP runtime initialized successfully');

            // STEP 3: Create Virtual Filesystem
            updateProgress(3, 'Creating virtual filesystem...');
            await new Promise(resolve => setTimeout(resolve, 100));

            const dirs = new Set();
            files.forEach(file => {
                const parts = file.path.split('/');
                if (parts.length > 1) {
                    let currentPath = '';
                    for (let i = 0; i < parts.length - 1; i++) {
                        currentPath += (currentPath ? '/' : '') + parts[i];
                        if (!dirs.has(currentPath)) {
                            try {
                                php.mkdirTree('/www/' + currentPath);
                                dirs.add(currentPath);
                                console.log('[VibePHP] Created directory:', currentPath);
                            } catch (e) {
                                // Directory might already exist
                            }
                        }
                    }
                }
            });

            // STEP 4: Mount Files
            updateProgress(4, 'Mounting ' + files.length + ' files...');
            
            let filesWritten = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    php.writeFile('/www/' + file.path, file.content);
                    filesWritten++;
                    
                    // Update progress for large file counts
                    if (files.length > 5 && i % Math.ceil(files.length / 3) === 0) {
                        updateProgress(4, 'Mounting files... (' + filesWritten + '/' + files.length + ')');
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    
                    console.log('[VibePHP] Wrote file:', file.path);
                } catch (e) {
                    console.error('[VibePHP] Failed to write file:', file.path, e);
                    throw new Error('Failed to write file: ' + file.path + '\\nError: ' + e.message);
                }
            }
            
            console.log('[VibePHP] All files written:', filesWritten);

            // STEP 5: Execute PHP Script
            updateProgress(5, 'Executing PHP script...');
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await php.run({
                code: \`<?php
                    error_reporting(E_ALL);
                    ini_set('display_errors', '1');
                    chdir('/www');
                    include '/www/\${entryPath}';
                ?>\`
            });
            
            console.log('[VibePHP] PHP execution completed');
            console.log('[VibePHP] Exit code:', result.exitCode);
            
            if (result.exitCode !== 0) {
                console.warn('[VibePHP] Non-zero exit code:', result.exitCode);
                if (result.errors) {
                    console.error('[VibePHP] PHP Errors:', result.errors);
                }
            }

            let output = result.text;
            console.log('[VibePHP] Output length:', output.length);
            
            if (!output || output.trim().length === 0) {
                throw new Error(
                    'PHP execution produced no output.\\n\\n' +
                    'Exit code: ' + result.exitCode + '\\n\\n' +
                    'This usually means:\\n' +
                    '• The PHP script has a syntax error\\n' +
                    '• The script exited early (e.g., die() or exit())\\n' +
                    '• No HTML was echoed\\n\\n' +
                    'Check your PHP code for errors.\\n' +
                    'Try wrapping your code in <?php ?> tags.'
                );
            }

            // STEP 6: Render Output
            updateProgress(6, 'Rendering output...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Inject CSS files inline
            const cssFiles = files.filter(f => f.path.endsWith('.css'));
            cssFiles.forEach(f => {
                const linkRegex = new RegExp(\`<link[^>]*href=["']\${f.path}["'][^>]*>\`, 'gi');
                output = output.replace(linkRegex, \`<style>\${f.content}</style>\`);
            });
            
            // Inject JS files inline
            const jsFiles = files.filter(f => f.path.endsWith('.js'));
            jsFiles.forEach(f => {
                const scriptRegex = new RegExp(\`<script[^>]*src=["']\${f.path}["'][^>]*><\\\\/script>\`, 'gi');
                output = output.replace(scriptRegex, \`<script>\${f.content}</script>\`);
            });

            // Complete! Show success briefly
            updateProgress(6, 'Complete! Rendering your app...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Hide loader with fade
            if (loader) {
                loader.style.transition = 'opacity 0.3s ease';
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 300);
            }
            
            // Render output
            document.body.innerHTML = output;
            
            // Re-execute inline scripts
            const scripts = document.body.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const oldScript = scripts[i];
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            }
            
            console.log('[VibePHP] 🎉 Rendering complete!');

        } catch (err) {
            console.error('[VibePHP] Boot error:', err);
            
            const errorDetails = 
                "=== VibePHP Boot Error ===\\n\\n" +
                "Error: " + err.message + 
                "\\n\\n=== Stack Trace ===\\n" + 
                (err.stack || 'No stack trace available') +
                "\\n\\n=== Debug Information ===\\n" +
                "Browser: " + navigator.userAgent + "\\n" +
                "Files: " + files.length + "\\n" +
                "Entry: " + entryPath + "\\n" +
                "Current Step: " + currentStep + "/" + totalSteps +
                "\\n\\n=== Solution ===\\n" +
                "1. Check the error message above\\n" +
                "2. Try reloading the page\\n" +
                "3. Check browser console for more details\\n" +
                "4. Verify your internet connection";
            
            showError(errorDetails);
        }
    }

    // Start boot process
    console.log('[VibePHP] Starting boot sequence...');
    console.log('[VibePHP] Files to load:', files.length);
    console.log('[VibePHP] Entry point:', entryPath);
    boot();
  `;
}