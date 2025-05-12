// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { BrowserRouter } from 'react-router-dom';
import { checkApiConfiguration, initBrowserAPIs, prefetchResources } from './utils/apiInit';

const container = document.getElementById('root');
const root = createRoot(container);

// Check API configuration in development mode
checkApiConfiguration();

// Initialize browser APIs
initBrowserAPIs();

// Prefetch resources for offline use
prefetchResources();

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// Initialize notification permissions if they're available
if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');
    }
  });
}

// Define custom event for handling service worker updates
window.addEventListener('swUpdated', event => {
  // This will add a notification when a new service worker update is available
  if ('serviceWorker' in navigator && event.detail) {
    const registration = event.detail;
    
    // Create a notification to inform user of update
    if (Notification.permission === 'granted') {
      const notification = new Notification('App Update Available', {
        body: 'A new version of the HVAC Assistant is available. Refresh to update.',
        icon: '/logo192.png'
      });
      
      notification.addEventListener('click', () => {
        if (registration.waiting) {
          // Ask the waiting service worker to take control
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Reload once the new service worker takes over
        window.location.reload();
      });
    }
    
    // Also add an update banner that can be clicked to update
    const updateBanner = document.createElement('div');
    updateBanner.className = 'install-banner';
    updateBanner.innerHTML = `
      <div>
        <strong>New version available!</strong>
        <p>Refresh to update the app with the latest features.</p>
      </div>
      <button id="update-button">Update Now</button>
    `;
    
    document.body.appendChild(updateBanner);
    
    document.getElementById('update-button').addEventListener('click', () => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
  }
});

// Check for app installation eligibility
window.addEventListener('appinstalled', () => {
  console.log('App was installed');
  // Hide the installation banner if it exists
  const installBanner = document.querySelector('.install-banner');
  if (installBanner) {
    installBanner.remove();
  }
});

// Performance monitoring
if (window.performance) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navTiming = window.performance.timing;
      const pageLoadTime = navTiming.loadEventEnd - navTiming.navigationStart;
      console.log(`Page load time: ${pageLoadTime}ms`);
      
      // You could send this to an analytics service
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/analytics/performance', JSON.stringify({
          pageLoadTime,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href
        }));
      }
    }, 0);
  });
}
