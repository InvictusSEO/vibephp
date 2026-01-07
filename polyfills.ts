// Polyfills for Node.js APIs in browser
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = {
    env: {},
    nextTick: (fn: Function) => setTimeout(fn, 0),
  };
  
  console.log('[VibePHP] Polyfills loaded:', {
    Buffer: !!window.Buffer,
    'Buffer.byteLength': typeof Buffer.byteLength === 'function',
  });
}
