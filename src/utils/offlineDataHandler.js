// src/utils/offlineDataHandler.js
import { getFromLocalStorage } from './storage';

// Predefined common HVAC issues for offline functionality
const commonHvacIssues = {
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
        },
        {
          issue: "Faulty compressor",
          severity: "High",
          description: "Compressor not circulating refrigerant properly"
        },
        {
          issue: "Thermostat issues",
          severity: "Low",
          description: "Incorrect settings or faulty thermostat"
        }
      ],
      troubleshooting: [
        "Step 1: Check and replace the air filter if dirty",
        "Step 2: Verify thermostat settings are correct",
        "Step 3: Check circuit breakers to ensure power is supplied",
        "Step 4: Inspect outdoor unit for debris or blockages",
        "Step 5: Check evaporator coil for ice buildup (if accessible)",
        "Step 6: Call a professional to check refrigerant levels if previous steps don't resolve the issue"
      ],
      requiredItems: [
        "Replacement air filter (if needed)",
        "Thermometer",
        "Multimeter (optional for electrical testing)"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Low refrigerant and compressor issues typically require professional service"
    },
    'making-noise': {
      possibleIssues: [
        {
          issue: "Loose components",
          severity: "Medium",
          description: "Parts may have come loose due to vibration"
        },
        {
          issue: "Fan blade obstruction",
          severity: "Medium",
          description: "Object interfering with fan movement"
        },
        {
          issue: "Failing compressor",
          severity: "High",
          description: "Internal compressor components wearing out"
        }
      ],
      troubleshooting: [
        "Step 1: Identify the source of the noise (indoor or outdoor unit)",
        "Step 2: Turn off power to the system",
        "Step 3: For outdoor unit, remove debris around unit and check for loose panels",
        "Step 4: For indoor unit, check for loose ductwork or mounting brackets",
        "Step 5: If the noise persists, professional diagnosis is required"
      ],
      requiredItems: [
        "Screwdriver set",
        "Work gloves"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Never attempt to open the compressor or handle refrigerant lines"
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
        },
        {
          issue: "Low refrigerant",
          severity: "High",
          description: "Insufficient refrigerant due to leak"
        },
        {
          issue: "Auxiliary heat issue",
          severity: "Medium",
          description: "Backup heating system not engaging"
        }
      ],
      troubleshooting: [
        "Step 1: Verify thermostat is set to 'Heat' mode",
        "Step 2: Check if outdoor unit is running and not covered in ice",
        "Step 3: Ensure emergency heat switch is not engaged unless necessary",
        "Step 4: Check air filter and replace if dirty",
        "Step 5: Verify circuit breakers are on",
        "Step 6: If temperature outside is below 30°F, check if auxiliary heat is working"
      ],
      requiredItems: [
        "Replacement air filter (if needed)",
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
          issue: "Ignition failure",
          severity: "Medium",
          description: "Electronic ignition not functioning"
        },
        {
          issue: "Gas supply issue",
          severity: "Medium",
          description: "Insufficient gas flow or closed valve"
        },
        {
          issue: "Limit switch tripped",
          severity: "High",
          description: "Safety switch activated due to overheating"
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
        "Step 4: For pilot systems, check if pilot light is lit",
        "Step 5: Reset furnace by turning off power for 30 seconds, then restore",
        "Step 6: Check for any error codes on control board (flashing lights)"
      ],
      requiredItems: [
        "Replacement air filter",
        "Long lighter (for pilot systems)",
        "Flashlight"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Never attempt repairs if you smell gas - leave the area and call a professional immediately"
    },
    'short-cycling': {
      possibleIssues: [
        {
          issue: "Dirty flame sensor",
          severity: "Medium",
          description: "Sensor covered in carbon deposits"
        },
        {
          issue: "Improper airflow",
          severity: "Medium",
          description: "Blocked returns or closed vents"
        },
        {
          issue: "Oversized furnace",
          severity: "Low",
          description: "Furnace too large for the space"
        },
        {
          issue: "Thermostat location issues",
          severity: "Low",
          description: "Thermostat getting false readings"
        }
      ],
      troubleshooting: [
        "Step 1: Replace air filter",
        "Step 2: Ensure all vents and returns are open and unobstructed",
        "Step 3: Check thermostat location for drafts or heat sources",
        "Step 4: If accessible, inspect flame sensor for corrosion or buildup",
        "Step 5: Check for flashing error codes on control board"
      ],
      requiredItems: [
        "Replacement air filter",
        "Fine sandpaper (for flame sensor cleaning - professional task)"
      ],
      repairComplexity: "Moderate",
      additionalNotes: "Flame sensor cleaning should ideally be performed by a professional"
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
  // Simplified keyword matching
  const symptomLower = symptoms.toLowerCase();
  let issueKey = null;
  
  // Detect issue type from symptoms
  if (symptomLower.includes('not cooling') || symptomLower.includes('no cool') || symptomLower.includes('isn\'t cooling')) {
    issueKey = 'not-cooling';
  } else if (symptomLower.includes('noise') || symptomLower.includes('loud') || symptomLower.includes('sound')) {
    issueKey = 'making-noise';
  } else if (symptomLower.includes('not heating') || symptomLower.includes('no heat') || symptomLower.includes('isn\'t heating')) {
    issueKey = 'not-heating';
  } else if (symptomLower.includes('no heat') || symptomLower.includes('won\'t heat')) {
    issueKey = 'no-heat';
  } else if (symptomLower.includes('cycling') || symptomLower.includes('turning on and off')) {
    issueKey = 'short-cycling';
  }
  
  // If we found a matching issue in our database
  if (systemType in commonHvacIssues && issueKey && issueKey in commonHvacIssues[systemType]) {
    return {
      ...commonHvacIssues[systemType][issueKey],
      source: 'predefined',
      note: 'This is a common issue diagnosis based on offline data. For a more accurate diagnosis, please connect to the internet.'
    };
  }
  
  // If no match found, return generic advice
  return {
    possibleIssues: [
      {
        issue: "Unknown issue",
        severity: "Unknown",
        description: "Cannot determine specific issue while offline"
      }
    ],
    troubleshooting: [
      "Step 1: Check power supply to the system",
      "Step 2: Verify thermostat settings",
      "Step 3: Check and replace air filters if dirty",
      "Step 4: Ensure all vents/registers are open",
      "Step 5: Connect to internet for more accurate diagnosis"
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
  // Implementation would depend on your storage strategy
  // Could use IndexedDB or localStorage
  console.log('Saving diagnostic data for offline use:', diagnosticData);
};
