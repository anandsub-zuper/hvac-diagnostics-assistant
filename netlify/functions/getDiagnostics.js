// netlify/functions/getDiagnostics.js
// Function to retrieve common diagnostic data

exports.handler = async (event, context) => {
  // Allow only GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // In a real-world scenario, this might fetch from a database
    // For now, we'll return a subset of common issues for offline use
    
    // Parse query parameters
    const params = event.queryStringParameters;
    const systemType = params?.systemType || 'all';
    
    // Get diagnostic data
    const diagnosticData = getCommonIssues(systemType);
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=86400" // Cache for 24 hours
      },
      body: JSON.stringify(diagnosticData)
    };
  } catch (error) {
    console.error('Error retrieving diagnostic data:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ 
        error: 'Failed to retrieve diagnostic data',
        details: error.message 
      })
    };
  }
};

// Helper function to get common issues by system type
function getCommonIssues(systemType) {
  // This is a simplified version of what might be stored in a database
  const commonIssues = {
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
          "Check and replace the air filter if dirty",
          "Verify thermostat settings are correct",
          "Check circuit breakers to ensure power is supplied",
          "Inspect outdoor unit for debris or blockages",
          "Check evaporator coil for ice buildup (if accessible)"
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
          "Verify thermostat is set to 'Heat' mode",
          "Check if outdoor unit is running and not covered in ice",
          "Check air filter and replace if dirty"
        ],
        requiredItems: [
          "Replacement air filter",
          "Thermometer"
        ],
        repairComplexity: "Moderate to Complex",
        additionalNotes: "Heat pumps are less effective in extremely cold temperatures"
      }
    }
  };
  
  // Return data for specific system type, or all data
  if (systemType !== 'all' && commonIssues[systemType]) {
    return {
      systemType: systemType,
      issues: commonIssues[systemType]
    };
  }
  
  return commonIssues;
}
