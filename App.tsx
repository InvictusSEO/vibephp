import React, { useState, useEffect, useRef } from 'react';
import type { File, Message, AgentStatus, ViewMode } from './types';
import { INITIAL_FILES } from './constants';
import { streamPlan, generateCode, streamFixPlan } from './services/nebius';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewFrame from './components/PreviewFrame';
import ChatMessage from './components/ChatMessage';
import { AgentUI } from './components/AgentUI';

// Backend URL
const EXECUTOR_URL = 'https://streamingsites.eu.org/phpvibe-executor/index.php';

function App() {
  const [files, setFiles] = useState<File[]>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<File | null>(INITIAL_FILES[0]);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "👋 Hello! I'm VibePHP, your AI PHP assistant. Describe the app you want to build, and I'll create it for you step by step.", 
      timestamp: Date.now() 
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // UI State
  const [mobileTab, setMobileTab] = useState<'chat' | 'code' | 'preview'>('chat');
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Agent State
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    state: 'IDLE',
    message: '',
    streamContent: ''
  });

  // Check mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load API Key
  useEffect(() => {
    const envKey = import.meta.env.VITE_NEBIUS_API_KEY;
    if (envKey) setApiKey(envKey);
    else {
      const savedKey = localStorage.getItem('nebius_api_key');
      if (savedKey) setApiKey(savedKey);
      else setShowApiKeyModal(true);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => { 
    scrollToBottom(); 
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end" 
    });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('nebius_api_key', tempApiKey.trim());
      setApiKey(tempApiKey.trim());
      setShowApiKeyModal(false);
      setTempApiKey('');
    }
  };

  // 1. START AGENT -> STREAM PLAN
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    if (!apiKey) { 
      setShowApiKeyModal(true); 
      return; 
    }

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: trimmedPrompt, 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMsg as Message]);
    setPrompt('');

    // On mobile, switch to chat tab to see the response
    if (isMobile) {
      setMobileTab('chat');
    }

    // START PLANNING PHASE
    setAgentStatus({ 
      state: 'PLANNING', 
      message: 'Designing your app architecture...', 
      streamContent: '' 
    });

    try {
      await streamPlan(userMsg.content, messages, apiKey, (text) => {
        setAgentStatus(prev => ({ ...prev, streamContent: text }));
      });
      setAgentStatus(prev => ({ ...prev, state: 'PLAN_READY' }));
    } catch (err: any) {
      console.error("Planning Error:", err);
      setAgentStatus({ 
        state: 'ERROR_DETECTED', 
        message: 'Planning Failed', 
        streamContent: '', 
        error: err.message || "Failed to connect to AI. Check your API Key or Model."
      });
    }
  };

  // 2. BUILD -> GENERATE & DEPLOY
  const handleStartCoding = async () => {
    setAgentStatus(prev => ({ ...prev, state: 'CODING', message: 'Writing code...' }));

    try {
      const data = await generateCode(agentStatus.streamContent, files, apiKey);

      // Update Files - DO NOT filter out Vibe.php
      let newFiles = [...files];
      data.files.forEach((f: any) => {
        const idx = newFiles.findIndex(existing => existing.path === f.path);
        if (idx >= 0) newFiles[idx] = { ...f, language: 'php' };
        else newFiles.push({ ...f, language: 'php' });
      });
      
      newFiles = newFiles.filter(f => f.path !== 'db_config.php');
      setFiles(newFiles);

      if (newFiles.length > 0 && !newFiles.find(f => f.path === activeFile?.path)) {
        setActiveFile(newFiles[0]);
      }

      // Verify (Dry Run)
      await verifyCode(newFiles);

    } catch (err: any) {
      setAgentStatus(prev => ({ ...prev, state: 'ERROR_DETECTED', error: err.message }));
    }
  };

  // 3. VERIFY (Dry Run on Backend)
  const verifyCode = async (filesToVerify: File[]) => {
    setAgentStatus(prev => ({ ...prev, state: 'VERIFYING', message: 'Testing your app...' }));

    let sessionId = sessionStorage.getItem('vibephp_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now();
      sessionStorage.setItem('vibephp_session_id', sessionId);
    }

    const res = await fetch(EXECUTOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filesToVerify, sessionId, dryRun: true })
    });

    const result = await res.json();

    if (result.success) {
      setAgentStatus({ state: 'IDLE', message: '', streamContent: '' });
      setViewMode('preview');
      if (isMobile) setMobileTab('preview');
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: '✅ **App built successfully!**\n\nYour application is ready to use. Switch to the preview tab to see it live.', 
        timestamp: Date.now() 
      }]);
    } else {
      const enhancedError = `
🚨 **Deployment Error**
${result.error}

📁 **Files Deployed:** ${filesToVerify.length}
🔑 **Session:** ${sessionId}

💡 **Troubleshooting Tips:**
1. Check if all tables are created with CREATE TABLE IF NOT EXISTS
2. Ensure you're using Vibe::table() for table names
3. Verify Vibe.php is included at top of index.php
      `.trim();
      
      setAgentStatus(prev => ({ 
        ...prev, 
        state: 'ERROR_DETECTED', 
        error: enhancedError,
        message: 'Diagnostics failed'
      }));
    }
  };

  // 4. PLAN FIX
  const handleCreateFix = async () => {
    const errorMsg = agentStatus.error || "Unknown error";
    setAgentStatus(prev => ({ ...prev, state: 'PLANNING_FIX', streamContent: '' }));

    try {
      await streamFixPlan(errorMsg, apiKey, (text) => {
        setAgentStatus(prev => ({ ...prev, streamContent: text }));
      });
      setAgentStatus(prev => ({ ...prev, state: 'FIX_READY' }));
    } catch (err: any) {
      console.error(err);
      setAgentStatus(prev => ({ 
        ...prev, 
        state: 'ERROR_DETECTED', 
        error: err.message 
      }));
    }
  };

  // 5. APPLY FIX
  const handleApplyFix = async () => {
    await handleStartCoding();
  };

  const downloadCode = () => {
    files.forEach(file => {
      if (file.path === 'db_config.php') return;
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const usingEnvKey = !!import.meta.env.VITE_NEBIUS_API_KEY;

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-gray-900 to-gray-950 text-gray-100 overflow-hidden relative font-sans">
      {/* API Key Modal */}
      {showApiKeyModal && !usingEnvKey && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
             <h2 className="text-xl font-bold text-white mb-3 text-center">🔑 API Key Required</h2>
             <p className="text-gray-400 text-sm mb-4 text-center">
               Enter your Nebius AI API key to continue
             </p>
             <input 
               type="password" 
               value={tempApiKey} 
               onChange={e => setTempApiKey(e.target.value)}
               className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white mb-4 text-sm focus:outline-none focus:border-blue-500 transition-colors touch-target"
               placeholder="sk-..."
               autoFocus
             />
             <button 
               onClick={handleSaveApiKey} 
               className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-xl font-medium hover:opacity-90 transition-opacity touch-target"
             >
               Save & Continue
             </button>
          </div>
        </div>
      )}

      {/* AGENT UI OVERLAY */}
      <AgentUI 
        status={agentStatus} 
        onConfirm={
          agentStatus.state === 'PLAN_READY' ? handleStartCoding : 
          agentStatus.state === 'ERROR_DETECTED' ? handleCreateFix : 
          handleApplyFix
        } 
        onCancel={() => setAgentStatus({ state: 'IDLE', message: '', streamContent: '' })}
      />

      {/* Mobile Header */}
      {isMobile && (
        <header className="h-14 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 z-40 shrink-0 pt-safe">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              <i className="fas fa-bolt text-sm"></i>
            </div>
            <h1 className="font-bold text-base">VibePHP</h1>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">AI</span>
          </div>

          <div className="flex items-center gap-3">
            {files.length > 0 && (
              <button 
                onClick={downloadCode}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Download Code"
              >
                <i className="fas fa-download text-sm"></i>
              </button>
            )}
            <div className="flex bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setMobileTab('chat')} 
                className={`px-3 py-1 text-xs rounded-lg transition-all ${mobileTab === 'chat' ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
              >
                <i className="fas fa-comment mr-1"></i> Chat
              </button>
              <button 
                onClick={() => setMobileTab('code')} 
                className={`px-3 py-1 text-xs rounded-lg transition-all ${mobileTab === 'code' ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
              >
                <i className="fas fa-code mr-1"></i> Code
              </button>
              <button 
                onClick={() => setMobileTab('preview')} 
                className={`px-3 py-1 text-xs rounded-lg transition-all ${mobileTab === 'preview' ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
              >
                <i className="fas fa-eye mr-1"></i> App
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <header className="h-14 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              <i className="fas fa-bolt"></i>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">VibePHP</h1>
              <p className="text-xs text-gray-400">AI PHP App Generator</p>
            </div>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-medium">DeepSeek</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('code')} 
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === 'code' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <i className="fas fa-code mr-2"></i> Code Editor
              </button>
              <button 
                onClick={() => setViewMode('preview')} 
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === 'preview' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <i className="fas fa-eye mr-2"></i> Live Preview
              </button>
            </div>
            
            <div className="w-px h-6 bg-gray-700"></div>
            
            {!usingEnvKey && apiKey && (
              <button 
                onClick={() => setShowApiKeyModal(true)} 
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <i className="fas fa-key mr-1"></i> API Key
              </button>
            )}
            
            {files.length > 0 && (
              <button 
                onClick={downloadCode}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <i className="fas fa-download"></i> Download
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="flex-col border-r border-gray-800 bg-gray-900 w-[380px] shrink-0 flex">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <i className="fas fa-comments text-blue-400"></i> Chat with AI
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar no-scrollbar">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} isMobile={false} />
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-xs">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="relative">
                  <textarea 
                    ref={textareaRef}
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => {
                      if(e.key === 'Enter' && !e.shiftKey) { 
                        e.preventDefault(); 
                        handleSendMessage(); 
                      }
                    }}
                    placeholder="Describe your PHP app idea..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-100 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none pr-12 min-h-[56px] max-h-[200px]"
                    rows={1}
                  />
                  <button 
                    type="submit" 
                    disabled={!prompt.trim()}
                    className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-blue-500/30"
                  >
                    <i className="fas fa-paper-plane text-sm"></i>
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </span>
                  <span className="text-xs text-gray-500">
                    {prompt.length}/2000
                  </span>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mobile Chat View */}
        {isMobile && mobileTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-gray-900 mobile-fullscreen">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar pb-24">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} isMobile={true} />
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 pb-safe mobile-bottom-sheet">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="flex gap-2">
                  <textarea 
                    ref={textareaRef}
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Message VibePHP..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500 transition-colors resize-none min-h-[44px] max-h-[120px]"
                    rows={1}
                  />
                  <button 
                    type="submit" 
                    disabled={!prompt.trim()}
                    className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-all touch-target"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Desktop Main Content */}
        {!isMobile && (
          <div className="flex-1 flex flex-col bg-gray-950">
            {/* Desktop Editor Header */}
            {viewMode === 'code' && (
              <div className="h-10 border-b border-gray-800 bg-gray-900 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowFileExplorer(!showFileExplorer)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    <i className={`fas fa-${showFileExplorer ? 'folder-open' : 'folder'} text-sm`}></i>
                  </button>
                  <div className="text-sm text-gray-300 font-medium">
                    {activeFile?.path || 'No file selected'}
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {activeFile?.language?.toUpperCase() || 'PHP'}
                </div>
              </div>
            )}

            <div className="flex-1 flex overflow-hidden">
              {viewMode === 'code' ? (
                <>
                  {/* Desktop File Explorer */}
                  {showFileExplorer && (
                    <div className="w-64 border-r border-gray-800 bg-gray-900 h-full overflow-y-auto custom-scrollbar">
                      <FileExplorer 
                        files={files} 
                        activeFile={activeFile} 
                        onSelectFile={setActiveFile}
                        isMobile={false}
                      />
                    </div>
                  )}
                  
                  {/* Desktop Code Editor */}
                  <div className="flex-1 h-full">
                    <CodeEditor file={activeFile} isMobile={false} />
                  </div>
                </>
              ) : (
                /* Desktop Preview */
                <div className="flex-1 bg-white h-full">
                  <PreviewFrame files={files} isMobile={false} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Code View */}
        {isMobile && mobileTab === 'code' && (
          <div className="flex-1 flex flex-col bg-gray-950 mobile-fullscreen">
            {/* Mobile File Explorer Header */}
            <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowFileExplorer(!showFileExplorer)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <i className={`fas fa-${showFileExplorer ? 'times' : 'bars'} text-sm`}></i>
                </button>
                <div className="text-sm text-gray-300 truncate max-w-[200px]">
                  {activeFile?.path || 'Files'}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {files.length} files
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
              {/* Mobile File Explorer Slide-out */}
              {showFileExplorer && (
                <div className="absolute inset-0 bg-gray-900 z-40 animate-fade-in">
                  <FileExplorer 
                    files={files} 
                    activeFile={activeFile} 
                    onSelectFile={(file) => {
                      setActiveFile(file);
                      setShowFileExplorer(false);
                    }}
                    isMobile={true}
                  />
                </div>
              )}
              
              {/* Mobile Code Editor */}
              <div className="flex-1 h-full">
                <CodeEditor file={activeFile} isMobile={true} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Preview View */}
        {isMobile && mobileTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-white mobile-fullscreen">
            <PreviewFrame files={files} isMobile={true} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
