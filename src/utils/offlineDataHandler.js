// src/utils/offlineDataHandler.js
import { getFromLocalStorage } from './storage';

// Predefined common HVAC issues for fallback offline functionality
// This is a subset summary of what's in the common-issues.json file
// Used only if the common-issues.json file can't be loaded
const fallbackHvacIssues = {
  'central-ac': {
    'not-cooling': {
      possibleIssues: [
        {
          issue: "Dirty air filter",
          severity: "Medium",
          description: "Restricted airflow due to clogged filter"
        },
        {
          issue: "Low refrigerant",
          severity: "High",
          description: "System may have a leak"
        },
        {
          issue: "Frozen evaporator coil",
          severity: "High",
          description: "Ice buildup preventing proper cooling"
        }
      ],
      troubleshooting: [
        "Step 1: Check and replace the air filter if dirty",
        "Step 2: Verify thermostat settings are correct",
        "Step 3: Check circuit breakers to ensure power is supplied",
        "Step 4: Inspect outdoor unit for debris or blockages",
        "Step 5: Check evaporator coil for ice buildup (if accessible)"
      ],
      requiredItems: [
        "Replacement air filter",
        "Thermometer"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Low refrigerant issues require professional service"
    }
  },
  'heat-pump': {
    'not-heating': {
      possibleIssues: [
        {
          issue: "Defrost cycle",
          severity: "Low",
          description: "Normal operation during cold weather"
        },
        {
          issue: "Valve malfunction",
          severity: "High",
          description: "Reversing valve stuck or failed"
        }
      ],
      troubleshooting: [
        "Step 1: Verify thermostat is set to 'Heat' mode",
        "Step 2: Check if outdoor unit is running and not covered in ice",
        "Step 3: Check air filter and replace if dirty"
      ],
      requiredItems: [
        "Replacement air filter",
        "Thermometer"
      ],
      repairComplexity: "Moderate to Complex",
      additionalNotes: "Heat pumps are less effective in extremely cold temperatures"
    }
  },
  'furnace': {
    'no-heat': {
      possibleIssues: [
        {
          issue: "Pilot light out (older systems)",
          severity: "Medium",
          description: "Pilot flame extinguished"
        },
        {
          issue: "Dirty filter",
          severity: "Low",
          description: "Restricted airflow causing system shutdown"
        }
      ],
      troubleshooting: [
        "Step 1: Check thermostat settings and battery",
        "Step 2: Replace air filter if dirty",
        "Step 3: Verify gas supply is on (check other gas appliances)",
        "Step 4: For pilot systems, check if pilot light is lit"
      ],
      requiredItems: [
        "Replacement air filter",
        "Long lighter (for pilot systems)"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Never attempt repairs if you smell gas - leave the area and call a professional immediately"
    }
  }
};

/**
 * Retrieves diagnostic data when offline
 * @param {string} systemType - Type of HVAC system
 * @param {object} systemInfo - Information about the system
 * @param {string} symptoms - Description of symptoms
 * @returns {Promise} - Resolves with diagnostic data
 */
export const getOfflineDiagnosticData = async (systemType, systemInfo, symptoms) => {
  // First try to find a match in previously saved diagnostics
  const savedDiagnostics = getFromLocalStorage('savedDiagnostics') || [];
  
  // Simple keyword matching from saved diagnostics
  const relevantDiagnostics = savedDiagnostics.filter(diag => 
    diag.systemType === systemType && 
    diag.symptoms.toLowerCase().includes(symptoms.toLowerCase())
  );
  
  if (relevantDiagnostics.length > 0) {
    // Return the most recent relevant diagnostic
    return {
      ...relevantDiagnostics[0].result,
      source: 'cached',
      note: 'This diagnosis is based on similar previous issues you\'ve encountered.'
    };
  }
  
  // If no saved diagnostics match, use the predefined common issues database
  try {
    // Attempt to fetch the common issues database
    const response = await fetch('/data/common-issues.json');
    const commonIssuesData = await response.json();
    
    if (!commonIssuesData || !commonIssuesData.systemTypes || !commonIssuesData.systemTypes[systemType]) {
      throw new Error('No data available for this system type');
    }
    
    // Convert symptoms to lowercase for matching
    const symptomsLower = symptoms.toLowerCase();
    let bestMatchIssue = null;
    let bestMatchScore = 0;
    
    // Search through all issues for this system type
    const systemIssues = commonIssuesData.systemTypes[systemType].issues;
    
    for (const [issueKey, issue] of Object.entries(systemIssues)) {
      let matchScore = 0;
      
      // Check for direct keyword matches in title and symptoms
      if (symptomsLower.includes(issue.title.toLowerCase())) {
        matchScore += 10;
      }
      
      // Check each symptom for matches
      issue.symptoms.forEach(symptom => {
        const symptomLower = symptom.toLowerCase();
        if (symptomsLower.includes(symptomLower)) {
          matchScore += 5;
        } else if (symptomLower.includes(symptomsLower)) {
          matchScore += 3;
        }
        
        // Check for partial word matches
        const words = symptomsLower.split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && symptomLower.includes(word)) {
            matchScore += 1;
          }
        });
      });
      
      // Consider system age as a factor if available
      if (systemInfo && systemInfo.age) {
        // Older systems are more prone to certain issues
        if (systemInfo.age === "16-20" || systemInfo.age === "20+") {
          // Increase score for component failures in older systems
          issue.possibleCauses.forEach(cause => {
            if (cause.cause.toLowerCase().includes("fail") || 
                cause.cause.toLowerCase().includes("leak") ||
                cause.cause.toLowerCase().includes("worn")) {
              matchScore += 2;
            }
          });
        }
      }
      
      // Track the best match so far
      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
        bestMatchIssue = { 
          key: issueKey,
          ...issue
        };
      }
    }
    
    // If we found a good match (score above threshold)
    if (bestMatchScore >= 3 && bestMatchIssue) {
      // Format the response to match the structure expected by the app
      return {
        possibleIssues: bestMatchIssue.possibleCauses.map(cause => ({
          issue: cause.cause,
          severity: cause.severity,
          description: cause.description
        })),
        troubleshooting: bestMatchIssue.troubleshooting,
        requiredItems: bestMatchIssue.requiredTools,
        repairComplexity: bestMatchIssue.repairComplexity,
        additionalNotes: bestMatchIssue.additionalNotes,
        source: 'predefined',
        note: 'This diagnosis is based on common issues data. For a more accurate diagnosis, please connect to the internet.'
      };
    }
    
    // If we don't have a good match but have the system type
    if (commonIssuesData.systemTypes[systemType]) {
      const systemName = commonIssuesData.systemTypes[systemType].name;
      return {
        possibleIssues: [
          {
            issue: "Unidentified issue with " + systemName,
            severity: "Unknown",
            description: "Could not determine specific issue based on symptoms provided"
          }
        ],
        troubleshooting: [
          "Check system for any visible abnormalities",
          "Verify power supply to the system",
          "Check air filters and replace if dirty",
          "Ensure all vents/registers are open and unobstructed",
          "Check thermostat settings",
          "Connect to internet for more accurate diagnosis"
        ],
        requiredItems: [
          "Replacement air filter",
          "Flashlight for visual inspection"
        ],
        repairComplexity: "Unknown",
        additionalNotes: "Limited diagnostic capability in offline mode. Please connect to the internet for a complete diagnosis.",
        source: 'generic',
        note: 'No specific match found in offline database. These are general troubleshooting steps.'
      };
    }
    
  } catch (error) {
    console.error('Error accessing offline diagnostic data:', error);
    
    // If there's an error loading the JSON file, try the fallback hardcoded data
    // Simplified keyword matching from hardcoded fallback data
    const symptomLower = symptoms.toLowerCase();
    let issueKey = null;
    
    // Detect issue type from symptoms with simple keyword matching
    if (symptomLower.includes('not cooling') || symptomLower.includes('no cool') || symptomLower.includes('isn\'t cooling')) {
      issueKey = 'not-cooling';
    } else if (symptomLower.includes('not heating') || symptomLower.includes('no heat') || symptomLower.includes('isn\'t heating')) {
      issueKey = 'not-heating';
    } else if (symptomLower.includes('no heat') || symptomLower.includes('won\'t heat')) {
      issueKey = 'no-heat';
    }
    
    // If we found a matching issue in our fallback database
    if (systemType in fallbackHvacIssues && issueKey && issueKey in fallbackHvacIssues[systemType]) {
      return {
        ...fallbackHvacIssues[systemType][issueKey],
        source: 'fallback',
        note: 'This is a basic diagnosis based on limited offline data. For a more accurate diagnosis, please connect to the internet.'
      };
    }
  }
  
  // If all else fails, return generic advice
  return {
    possibleIssues: [
      {
        issue: "Unknown issue",
        severity: "Unknown",
        description: "Cannot determine specific issue while offline"
      }
    ],
    troubleshooting: [
      "Check power supply to the system",
      "Verify thermostat settings",
      "Check and replace air filters if dirty",
      "Ensure all vents/registers are open",
      "Connect to internet for more accurate diagnosis"
    ],
    requiredItems: [
      "Replacement air filter",
      "Flashlight for visual inspection"
    ],
    repairComplexity: "Unknown",
    additionalNotes: "Limited diagnostic capability in offline mode. Please connect to the internet for a complete diagnosis.",
    source: 'generic',
    note: 'This is generic advice based on limited offline data.'
  };
};

/**
 * Saves diagnostic data for offline access
 * @param {object} diagnosticData - Complete diagnostic data to save
 */
export const saveOfflineDiagnosticData = (diagnosticData) => {
  // This function caches diagnostic results for access when offline
  // In a real implementation, this might use IndexedDB for larger datasets
  try {
    // Get existing diagnostic cache
    const diagnosticCache = getFromLocalStorage('diagnosticCache') || [];
    
    // Add new diagnostic data, limiting cache size to prevent storage issues
    const updatedCache = [
      diagnosticData,
      ...diagnosticCache.filter(item => item.id !== diagnosticData.id)
    ].slice(0, 20); // Keep only the 20 most recent entries
    
    // Save back to localStorage
    localStorage.setItem('diagnosticCache', JSON.stringify(updatedCache));
    return true;
  } catch (error) {
    console.error('Error saving diagnostic data for offline use:', error);
    return false;
  }
};

/**
 * Prefetch and cache common diagnostic data for offline use
 * Called during app initialization or when online to ensure offline readiness
 */
export const prefetchOfflineData = async () => {
  try {
    // Fetch the common issues data and cache it
    const response = await fetch('/data/common-issues.json');
    const commonIssuesData = await response.json();
    
    // Store in localStorage for offline access
    localStorage.setItem('commonIssuesData', JSON.stringify(commonIssuesData));
    
    // Also cache important reference materials
    await cacheReferenceDocuments();
    
    console.log('Offline data prefetched successfully');
    return true;
  } catch (error) {
    console.error('Error prefetching offline data:', error);
    return false;
  }
};

/**
 * Cache important reference documents for offline access
 * @private
 */
const cacheReferenceDocuments = async () => {
  // List of critical reference documents to cache
  const criticalDocs = [
    '/data/reference/troubleshooting-guide.json',
    '/data/reference/maintenance-checklist.json'
  ];
  
  try {
    const cachePromises = criticalDocs.map(async (docUrl) => {
      try {
        const response = await fetch(docUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${docUrl}`);
        
        const docData = await response.json();
        localStorage.setItem(`ref_${docUrl.split('/').pop()}`, JSON.stringify(docData));
        return true;
      } catch (docError) {
        console.warn(`Could not cache document ${docUrl}:`, docError);
        return false;
      }
    });
    
    await Promise.all(cachePromises);
  } catch (error) {
    console.error('Error caching reference documents:', error);
  }
};

/**
 * Check if required offline data is available
 * @returns {boolean} - True if offline data is available
 */
export const isOfflineDataAvailable = () => {
  // Check if the main common issues data is cached
  const commonIssuesData = localStorage.getItem('commonIssuesData');
  return !!commonIssuesData;
};

/**
 * Get system type name from code
 * @param {string} systemTypeCode - System type code (e.g., 'central-ac')
 * @returns {string} - Human-readable system type name
 */
export const getSystemTypeName = (systemTypeCode) => {
  // Try to get from cached common issues data
  try {
    const commonIssuesData = JSON.parse(localStorage.getItem('commonIssuesData'));
    if (commonIssuesData && 
        commonIssuesData.systemTypes && 
        commonIssuesData.systemTypes[systemTypeCode]) {
      return commonIssuesData.systemTypes[systemTypeCode].name;
    }
  } catch (error) {
    console.warn('Error reading system type name from cache:', error);
  }
  
  // Fallback mapping if data isn't available
  const systemTypeMap = {
    'central-ac': 'Central Air Conditioning',
    'heat-pump': 'Heat Pump',
    'furnace': 'Furnace',
    'boiler': 'Boiler',
    'mini-split': 'Mini-Split / Ductless System',
    'package-unit': 'Package Unit'
  };
  
  return systemTypeMap[systemTypeCode] || 'Unknown System Type';
};
