// Ensure that global Request is temporarily hidden during module load
// to prevent libraries like formdata-polyfill from attempting to monkey-patch
// the read-only window.fetch.

const g = (typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
  ? window
  : typeof self !== 'undefined'
  ? self
  : {}) as any;

const originalRequest = g.Request;

let requestHidden = false;

if (originalRequest) {
  try {
    // Try configuring/deleting first
    Object.defineProperty(g, 'Request', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    requestHidden = true;
  } catch (e) {
    try {
      delete g.Request;
      requestHidden = true;
    } catch (err) {
      g.Request = undefined;
      requestHidden = true;
    }
  }
}

// Restore it as soon as the synchronous evaluation of all imports is complete
Promise.resolve().then(() => {
  if (requestHidden && originalRequest) {
    try {
      Object.defineProperty(g, 'Request', {
        value: originalRequest,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      try {
        g.Request = originalRequest;
      } catch (err) {
        console.warn('Failed to restore Request on window:', err);
      }
    }
  }
});
