// src/utils/apiInit.js

/**
 * Check and log API key availability
 * This helps with troubleshooting API configuration issues
 */
export const checkApiConfiguration = () => {
  // Only check in development environment
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  const apiConfigs = [
    { name: 'Google Maps', key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY },
    { name: 'Rentcast', key: process.env.REACT_APP_RENTCAST_API_KEY },
    { name: 'Zuper', key: process.env.REACT_APP_ZUPER_API_KEY },
    { name: 'Backend URL', key: process.env.REACT_APP_BACKEND_URL },
  ];
  
  console.group('API Configuration Check');
  apiConfigs.forEach(api => {
    if (!api.key) {
      console.warn(`⚠️ ${api.name} API key is missing`);
    } else {
      console.log(`✅ ${api.name} API key is configured`);
    }
  });
  console.groupEnd();
  
  // Log Zuper region setting
  if (process.env.REACT_APP_ZUPER_REGION) {
    console.log(`ℹ️ Zuper region is set to: ${process.env.REACT_APP_ZUPER_REGION}`);
  } else {
    console.warn('⚠️ Zuper region not specified, using default: us');
  }
};

/**
 * Initialize necessary browser APIs
 */
export const initBrowserAPIs = () => {
  // Enable geolocation for offline use
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(permission => {
        if (permission.state === 'granted') {
          console.log('✅ Geolocation permission already granted');
        } else if (permission.state === 'prompt') {
          console.log('ℹ️ Geolocation permission will be requested when needed');
        } else {
          console.warn('⚠️ Geolocation permission denied');
        }
      })
      .catch(error => {
        console.error('Error checking geolocation permission:', error);
      });
  }
  
  // Check for cache storage API for offline data
  if ('caches' in window) {
    console.log('✅ Cache Storage API is available');
    
    // Pre-create cache for API responses
    caches.open('api-responses').catch(error => {
      console.error('Error creating API cache:', error);
    });
  } else {
    console.warn('⚠️ Cache Storage API is not available - offline functionality may be limited');
  }
};

/**
 * Prefetch common API resources for offline use
 */
export const prefetchResources = async () => {
  // Only prefetch in production environment
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  try {
    if ('caches' in window) {
      const cache = await caches.open('api-responses');
      
      // List of important API endpoints to cache
      const urlsToCache = [
        `${process.env.REACT_APP_BACKEND_URL}/api/diagnose`,
      ];
      
      // Prefetch and store responses
      await Promise.all(
        urlsToCache.map(async url => {
          try {
            // Use HEAD request to pre-warm connection
            await fetch(url, { method: 'HEAD' });
            console.log(`Prefetched: ${url}`);
          } catch (error) {
            console.warn(`Failed to prefetch ${url}:`, error);
          }
        })
      );
    }
  } catch (error) {
    console.error('Error prefetching resources:', error);
  }
};

export default {
  checkApiConfiguration,
  initBrowserAPIs,
  prefetchResources
};
