import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  isMobile?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isMobile = false }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[90%] ${isMobile ? 'rounded-2xl' : 'rounded-xl'} px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
        style={{
          maxWidth: isMobile ? '85%' : '90%'
        }}
      >
        {!isUser && (
          <div className="font-medium text-xs text-blue-400 mb-2 flex items-center gap-2">
            <i className="fas fa-robot"></i>
            <span>VibePHP Assistant</span>
          </div>
        )}
        
        <div className="prose prose-invert max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0 prose-li:my-1 prose-ul:my-2 prose-headings:my-3">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="my-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-gray-900/50 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs my-3">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {message.isLoading && (
          <div className="mt-3 flex space-x-1.5">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
