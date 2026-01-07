import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('VibePHP: Index module loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  const msg = "Could not find root element to mount to";
  console.error(msg);
  throw new Error(msg);
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('VibePHP: Mounted successfully');
} catch (error) {
  console.error('VibePHP: Failed to mount application', error);
  throw error;
}