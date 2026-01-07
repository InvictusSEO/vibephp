import React from 'react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-bolt-accent text-white rounded-br-none'
            : 'bg-bolt-hover text-bolt-text border border-bolt-border rounded-bl-none'
        }`}
      >
        {!isUser && (
          <div className="font-semibold text-xs text-blue-400 mb-1 flex items-center gap-2">
            <span>VibePHP</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.isLoading && (
          <div className="mt-2 flex space-x-1.5 opacity-70">
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