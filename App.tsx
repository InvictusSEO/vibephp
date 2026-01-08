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
      content: "Hi! I'm VibePHP. Describe your idea, and I'll create a plan before building it.", 
      timestamp: Date.now() 
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  // UI State
  const [mobileTab, setMobileTab] = useState<'chat' | 'ide'>('chat');
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agent State
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    state: 'IDLE',
    message: '',
    streamContent: ''
  });

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

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

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
    if (!prompt.trim()) return;

    if (!apiKey) { setShowApiKeyModal(true); return; }

    const userMsg = { id: Date.now().toString(), role: 'user', content: prompt, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg as Message]);
    setPrompt('');

    // START PLANNING PHASE
    setAgentStatus({ state: 'PLANNING', message: 'Architecting solution...', streamContent: '' });
    
    try {
      // Call the service to stream the plan
      await streamPlan(userMsg.content, messages, apiKey, (text) => {
        setAgentStatus(prev => ({ ...prev, streamContent: text }));
      });
      // When done, wait for user confirmation
      setAgentStatus(prev => ({ ...prev, state: 'PLAN_READY' }));
    } catch (err: any) {
      console.error("Planning Error:", err);
      // SHOW ERROR IN UI INSTEAD OF CLOSING
      setAgentStatus({ 
        state: 'ERROR_DETECTED', 
        message: 'Planning Failed', 
        streamContent: '', 
        error: err.message || "Failed to connect to AI. Check your API Key."
      });
    }
  };

  // 2. BUILD -> GENERATE & DEPLOY
  const handleStartCoding = async () => {
    setAgentStatus(prev => ({ ...prev, state: 'CODING', message: 'Generating files...' }));

    try {
      // Generate Code
      const data = await generateCode(agentStatus.streamContent, files, apiKey);
      
      // Update Files
      let newFiles = [...files];
      data.files.forEach((f: any) => {
        if (f.path === 'db_config.php') return;
        const idx = newFiles.findIndex(existing => existing.path === f.path);
        if (idx >= 0) newFiles[idx] = { ...f, language: 'php' };
        else newFiles.push({ ...f, language: 'php' });
      });
      newFiles = newFiles.filter(f => f.path !== 'db_config.php');
      setFiles(newFiles);

      // Verify (Dry Run)
      await verifyCode(newFiles);

    } catch (err: any) {
      setAgentStatus(prev => ({ ...prev, state: 'ERROR_DETECTED', error: err.message }));
    }
  };

  // 3. VERIFY (Dry Run on Backend)
  const verifyCode = async (filesToVerify: File[]) => {
    setAgentStatus(prev => ({ ...prev, state: 'VERIFYING', message: 'Running diagnostics...' }));

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
      // SUCCESS!
      setAgentStatus({ state: 'IDLE', message: '', streamContent: '' });
      setViewMode('preview');
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), role: 'assistant', content: '✅ App built and verified successfully.', timestamp: Date.now() 
      }]);
    } else {
      // FAILURE
      setAgentStatus(prev => ({ 
        ...prev, 
        state: 'ERROR_DETECTED', 
        error: result.error,
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
    <div className="flex flex-col h-[100dvh] bg-bolt-dark text-bolt-text overflow-hidden font-sans relative">
      
      {/* API Key Modal */}
      {showApiKeyModal && !usingEnvKey && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-bolt-gray border border-bolt-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
             <h2 className="text-xl font-bold text-white mb-4 text-center">API Key Required</h2>
             <input type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} 
                    className="w-full bg-bolt-dark border border-bolt-border rounded p-3 text-white mb-4" placeholder="Nebius API Key" />
             <button onClick={handleSaveApiKey} className="w-full bg-blue-600 text-white p-3 rounded font-bold">Save</button>
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

      {/* Header */}
      <header className="h-14 border-b border-bolt-border flex items-center justify-between px-4 lg:px-6 bg-bolt-gray shrink-0 z-30">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold font-mono text-lg shadow-lg">V</div>
           <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">VibePHP <span className="text-xs font-normal text-green-400 border border-green-400/30 px-1.5 py-0.5 rounded ml-2">DeepSeek</span></h1>
        </div>
        
        <div className="flex md:hidden bg-bolt-dark p-1 rounded-lg border border-bolt-border">
          <button onClick={() => setMobileTab('chat')} className={`px-3 py-1 text-xs rounded ${mobileTab === 'chat' ? 'bg-bolt-hover text-white' : 'text-gray-400'}`}>Chat</button>
          <button onClick={() => setMobileTab('ide')} className={`px-3 py-1 text-xs rounded ${mobileTab === 'ide' ? 'bg-bolt-hover text-white' : 'text-gray-400'}`}>Code</button>
        </div>

        <div className="flex items-center gap-2">
            {!usingEnvKey && apiKey && (
                <button onClick={() => setShowApiKeyModal(true)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">Key</button>
            )}
             <button onClick={downloadCode} className="px-3 py-1.5 text-xs bg-bolt-hover rounded-full text-white hover:bg-bolt-border transition-colors">Download</button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
         {/* Sidebar */}
         <div className={`flex-col border-r border-bolt-border bg-bolt-dark w-full md:w-[400px] shrink-0 z-20 ${mobileTab === 'chat' ? 'flex absolute inset-0 md:static' : 'hidden md:flex'}`}>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                <div ref={messagesEndRef} />
            </div>
            {/* Input Area */}
            <div className="p-4 border-t border-bolt-border bg-bolt-gray/50 backdrop-blur">
               <form onSubmit={handleSendMessage} className="relative">
                  <textarea 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)} 
                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Describe your app..." 
                    className="w-full bg-bolt-dark border border-bolt-border rounded-xl p-3 text-sm h-24 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none"
                  />
                  <button type="submit" disabled={!prompt.trim()} className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors">
                    →
                  </button>
               </form>
            </div>
         </div>

         {/* Editor/Preview */}
         <div className={`flex-col flex-1 bg-[#0f1014] ${mobileTab === 'ide' ? 'flex absolute inset-0 md:static' : 'hidden md:flex'}`}>
            <div className="h-10 border-b border-bolt-border bg-bolt-gray flex items-center px-2 justify-between shrink-0">
                <div className="md:hidden"></div>
                <div className="flex p-1 bg-bolt-dark rounded-lg border border-bolt-border">
                    <button onClick={() => setViewMode('code')} className={`px-4 py-1 text-xs rounded-md transition-colors ${viewMode === 'code' ? 'bg-bolt-hover text-white' : 'text-gray-500'}`}>Code</button>
                    <button onClick={() => setViewMode('preview')} className={`px-4 py-1 text-xs rounded-md transition-colors ${viewMode === 'preview' ? 'bg-bolt-hover text-white' : 'text-gray-500'}`}>Preview</button>
                </div>
                <div className="w-8"></div>
            </div>
            <div className="flex-1 flex overflow-hidden relative">
                {viewMode === 'code' ? (
                   <>
                     <div className={`w-64 border-r border-bolt-border bg-bolt-gray absolute md:static h-full z-10 transition-transform ${showFileExplorer ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                        <FileExplorer files={files} activeFile={activeFile} onSelectFile={(f) => { setActiveFile(f); if(window.innerWidth < 768) setShowFileExplorer(false); }} />
                     </div>
                     <div className="flex-1 h-full"><CodeEditor file={activeFile} /></div>
                   </>
                ) : (
                   <div className="flex-1 bg-white h-full"><PreviewFrame files={files} /></div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
}

export default App;
