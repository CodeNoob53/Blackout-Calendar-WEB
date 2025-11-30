import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove splash screen after app mount
const splash = document.getElementById('splash-screen');
if (splash) {
  // Small delay to ensure React has painted
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.remove();
    }, 500); // Match CSS transition duration
  }, 500); // Minimum visibility time
}
