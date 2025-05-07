// src/utils/storage.js
/**
 * Retrieves a value from localStorage with proper error handling
 * @param {string} key - The key to retrieve from localStorage
 * @returns {any} - The parsed value or null if not found
 */
export const getFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Saves a value to localStorage with proper error handling
 * @param {string} key - The key to store the value under
 * @param {any} value - The value to store
 * @returns {boolean} - True if successful, false otherwise
 */
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    
    // If quota exceeded error, try to clear some space
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Remove older items if needed
      clearOldestItems();
      
      // Try again
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryError) {
        console.error('Still unable to save after clearing space:', retryError);
        return false;
      }
    }
    
    return false;
  }
};

/**
 * Removes a value from localStorage
 * @param {string} key - The key to remove
 * @returns {boolean} - True if successful, false otherwise
 */
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

/**
 * Clears all data from localStorage
 * @returns {boolean} - True if successful, false otherwise
 */
export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Saves a diagnostic result to localStorage
 * @param {object} diagnostic - The diagnostic data to save
 * @returns {boolean} - True if successful, false otherwise
 */
export const saveDiagnosticToLocalStorage = (diagnostic) => {
  // Get existing saved diagnostics
  const savedDiagnostics = getFromLocalStorage('savedDiagnostics') || [];
  
  // Add the new diagnostic
  savedDiagnostics.push(diagnostic);
  
  // Keep only the last 50 diagnostics to conserve space
  const trimmedDiagnostics = savedDiagnostics.slice(-50);
  
  // Save back to localStorage
  return saveToLocalStorage('savedDiagnostics', trimmedDiagnostics);
};

/**
 * Clears the oldest items from localStorage when approaching quota limits
 */
const clearOldestItems = () => {
  const savedDiagnostics = getFromLocalStorage('savedDiagnostics') || [];
  
  if (savedDiagnostics.length > 10) {
    // Remove the oldest half of the diagnostics
    const newDiagnostics = savedDiagnostics.slice(Math.floor(savedDiagnostics.length / 2));
    saveToLocalStorage('savedDiagnostics', newDiagnostics);
  }
  
  // Remove any other non-essential cached data
  // ...
};
