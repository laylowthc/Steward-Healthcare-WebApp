import './patch';

// Prevent formdata-polyfill from attempting to monkey-patch the read-only window.fetch
if (typeof window !== 'undefined') {
  if (typeof window.FormData === 'undefined') {
    (window as any).FormData = class FormData {
      append() {}
      delete() {}
      get() { return null; }
      getAll() { return []; }
      has() { return false; }
      set() {}
      forEach() {}
      *keys() { yield* []; }
      *values() { yield* []; }
      *entries() { yield* []; }
      [Symbol.iterator]() { return this.entries(); }
    };
  } else if (!window.FormData.prototype.keys) {
    window.FormData.prototype.keys = function* (this: any) {
      yield* [];
    };
  }
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


