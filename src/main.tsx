import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress benign ResizeObserver loop notifications in browser environment
const resizeObserverLoopErrRe = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;
window.addEventListener('error', (e) => {
  if (e.message && resizeObserverLoopErrRe.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

