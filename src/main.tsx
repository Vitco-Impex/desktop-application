/**
 * Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { config } from './config';

// Expose API base URL to window for Electron main process to access
declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

window.__API_BASE_URL__ = config.api.baseURL;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

