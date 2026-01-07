import React, { useState, useEffect, useRef } from 'react';
import type { File, Message, ViewMode } from './types';
import { INITIAL_FILES } from './constants';
import { generateAppCode } from './services/geminiService';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewFrame from './components/PreviewFrame';
import ChatMessage from './components/ChatMessage';

function App() {
  const [files, setFiles] = useState<File[]>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<File | null>(INITIAL_FILES[0]);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "Hi! I'm VibePHP. Describe the PHP app you want to build, and I'll generate the code for you.", 
      timestamp: Date.now() 
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  
  // Mobile specific state
  const [mobileTab, setMobileTab] = useState<'chat' | 'ide'>('chat');
  const [showFileExplorer, setShowFileExplorer] = useState(true); // Default true for desktop
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-hide file explorer on mobile on initial load
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowFileExplorer(false);
    }
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setIsGenerating(true);

    try {
      const loadingMsgId = (Date.now() + 1).toString();
      const loadingMsg: Message = {
        id: loadingMsgId,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: Date.now(),
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMsg]);

      const data = await generateAppCode(userMsg.content, files, messages);
      
      const newFiles = [...files];
      data.files.forEach(generatedFile => {
        const index = newFiles.findIndex(f => f.path === generatedFile.path);
        const language = generatedFile.path.split('.').pop() || 'text';
        if (index >= 0) {
          newFiles[index] = { ...generatedFile, language };
        } else {
          newFiles.push({ ...generatedFile, language });
        }
      });
      setFiles(newFiles);
      
      const indexFile = newFiles.find(f => f.path === 'index.php' || f.path === 'index.html');
      if (indexFile) setActiveFile(indexFile);
      
      setViewMode('preview');
      
      // On mobile, auto-switch to IDE view when code is generated
      if (window.innerWidth < 768) {
        setMobileTab('ide');
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingMsgId);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.explanation || "I've updated the code based on your request.",
          timestamp: Date.now()
        }];
      });

    } catch (error) {
      console.error(error);
      setMessages(prev => {
         const filtered = prev.filter(m => !m.isLoading);
         return [...filtered, {
           id: Date.now().toString(),
           role: 'assistant',
           content: "Sorry, I encountered an error generating the code. Please try again.",
           timestamp: Date.now()
         }];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCode = () => {
    files.forEach(file => {
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

  return (
    <div className="flex flex-col h-[100dvh] bg-bolt-dark text-bolt-text overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-bolt-border flex items-center justify-between px-4 lg:px-6 bg-bolt-gray shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold font-mono text-lg shadow-lg">V</div>
          <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">VibePHP</h1>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden bg-bolt-dark p-1 rounded-lg border border-bolt-border">
          <button 
            onClick={() => setMobileTab('chat')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mobileTab === 'chat' ? 'bg-bolt-hover text-white' : 'text-gray-400'}`}
          >
            Chat
          </button>
          <button 
            onClick={() => setMobileTab('ide')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mobileTab === 'ide' ? 'bg-bolt-hover text-white' : 'text-gray-400'}`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={downloadCode}
             className="px-3 py-1.5 text-xs font-medium bg-bolt-hover hover:bg-bolt-border border border-bolt-border rounded-full transition-all flex items-center gap-2 text-white hover:text-blue-400"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             <span className="hidden sm:inline">Download</span>
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Chat & Settings */}
        <div className={`
          flex-col border-r border-bolt-border bg-bolt-dark shrink-0 z-20 transition-all duration-300
          absolute inset-0 md:static md:flex
          ${mobileTab === 'chat' ? 'flex' : 'hidden'}
          w-full md:w-[350px] lg:w-[400px]
        `}>
           {/* Messages Area */}
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-bolt-border bg-bolt-gray/50 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Describe your PHP app..."
                  className="w-full bg-bolt-dark border border-bolt-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-bolt-accent focus:ring-1 focus:ring-bolt-accent resize-none h-24 custom-scrollbar transition-all placeholder-gray-600"
                />
                <button 
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute right-3 bottom-3 p-2 bg-bolt-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-blue-500/20"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  )}
                </button>
              </form>
           </div>
        </div>

        {/* Right: Code & Preview */}
        <div className={`
          flex-col min-w-0 bg-[#0f1014] flex-1
          absolute inset-0 md:static md:flex
          ${mobileTab === 'ide' ? 'flex' : 'hidden'}
        `}>
           {/* View Tabs */}
           <div className="h-10 border-b border-bolt-border bg-bolt-gray flex items-center px-2 justify-between shrink-0">
             <div className="flex items-center">
                {viewMode === 'code' && (
                  <button 
                    onClick={() => setShowFileExplorer(!showFileExplorer)}
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
                )}
             </div>

             <div className="flex p-1 bg-bolt-dark rounded-lg border border-bolt-border">
                <button 
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'code' ? 'bg-bolt-hover text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Code
                </button>
                <button 
                  onClick={() => setViewMode('preview')}
                  className={`px-4 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'preview' ? 'bg-bolt-hover text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Preview
                </button>
              </div>

              <div className="w-8"></div> {/* Spacer for balance */}
           </div>

           {/* Workspace Content */}
           <div className="flex-1 overflow-hidden relative flex flex-row">
              {viewMode === 'code' ? (
                <>
                  {/* File Explorer - Responsive */}
                  <div className={`
                    absolute md:static z-10 h-full bg-bolt-gray border-r border-bolt-border transition-all duration-200
                    ${showFileExplorer ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden border-none'}
                  `}>
                     <div className="w-64 h-full"> {/* Inner container to maintain width during animation */}
                      <FileExplorer files={files} activeFile={activeFile} onSelectFile={(f) => { setActiveFile(f); if(window.innerWidth < 768) setShowFileExplorer(false); }} />
                     </div>
                  </div>
                  
                  {/* Backdrop for mobile file explorer */}
                  {showFileExplorer && (
                    <div 
                      className="absolute inset-0 bg-black/50 z-0 md:hidden"
                      onClick={() => setShowFileExplorer(false)}
                    ></div>
                  )}

                  <div className="flex-1 h-full overflow-hidden relative">
                     <CodeEditor file={activeFile} />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-white text-black">
                   <PreviewFrame files={files} />
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

export default App;