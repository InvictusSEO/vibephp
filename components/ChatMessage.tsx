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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
      >
        {!isUser && (
          <div className="font-medium text-xs text-blue-400 mb-2">
            VibePHP Assistant
          </div>
        )}
        
        <div className="whitespace-pre-wrap">
          {message.content.split('\n').map((line, i) => (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              {line}
            </div>
          ))}
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
