// Polyfill/Patch for environment-specific read-only window.fetch getter
try {
  const originalFetch = window.fetch;
  let customFetch = originalFetch;
  
  Object.defineProperty(window, 'fetch', {
    get() {
      return customFetch;
    },
    set(val) {
      customFetch = val;
    },
    configurable: true,
    enumerable: true,
  });

  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, 'fetch', {
      get() {
        return customFetch;
      },
      set(val) {
        customFetch = val;
      },
      configurable: true,
      enumerable: true,
    });
  }
} catch (e) {
  console.warn('Failed to define fetch property setter:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

