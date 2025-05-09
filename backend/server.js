// server.js - With improved error handling
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

// Create express app
const app = express();

// Get port from environment
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://hvac-ai-assistant.netlify.app', 'http://localhost:3000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,OPTIONS',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for image data

// Configure OpenAI with better error handling
let openai;
try {
  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    console.error('WARNING: OPENAI_API_KEY environment variable is not set');
    // We'll handle this in the route handlers instead of crashing
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Error initializing OpenAI:', error);
  // Continue app startup even if OpenAI init fails
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send({
    status: 'ok',
    message: 'HVAC Diagnostics API is running',
    env: {
      node_env: process.env.NODE_ENV,
      openai_key_configured: !!process.env.OPENAI_API_KEY,
    }
  });
});

// Diagnostic endpoint with error handling
app.post('/api/diagnose', async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please check server configuration.',
        fallbackMode: true
      });
    }
    
    const { systemType, systemInfo, symptoms } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    console.log("Processing diagnosis request for:", systemType);

    // Construct a detailed prompt for the OpenAI model
    const prompt = constructDiagnosticPrompt(systemType, systemInfo, symptoms);
    
    // Call OpenAI API with error handling
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a faster model to reduce latency
      messages: [
        {
          role: "system",
          content: "You are an expert HVAC technician assistant. Your job is to diagnose HVAC issues based on the symptoms provided and suggest possible solutions. Provide step-by-step troubleshooting instructions that are clear and concise."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // Lower temperature for more deterministic/factual responses
      max_tokens: 800, // Reduced slightly to improve response time
    });

    // Process the response
    const diagnosisResult = processDiagnosisResult(completion.choices[0].message.content);
    
    // Add basic cost estimates (simplified without additional API call)
    diagnosisResult.costEstimates = generateRuleBasedCostEstimates(diagnosisResult);
    
    console.log("Diagnosis completed successfully");
    return res.json(diagnosisResult);
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    
    // Send a more graceful error response
    return res.status(500).json({ 
      error: 'An error occurred while processing the diagnosis',
      message: 'Please try again or use offline mode.',
      details: error.message,
      fallbackMode: true
    });
  }
});

// Image analysis endpoint with error handling
app.post('/api/analyze-image', async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please check server configuration.',
        systemInfo: {
          systemType: "",
          brand: "",
          model: "",
          age: ""
        }
      });
    }
    
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        error: 'No image data provided'
      });
    }
    
    console.log("Processing image analysis request");
    
    // Call OpenAI's Vision API for image analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert HVAC technician specializing in identifying HVAC equipment from images. Extract as much information as possible about the system including:
1. System type (Central AC, Heat Pump, Furnace, Boiler, Mini-Split, etc.)
2. Brand/manufacturer
3. Model information (numbers and letters visible on data plate)
4. Serial number (if clearly visible)
5. Manufacturing date (if visible or can be derived from serial number)
6. System capacity/tonnage (usually listed as BTU or tons)
7. SEER/AFUE/HSPF rating (efficiency ratings)
8. Visible condition assessment
9. Approximate age based on appearance and model
10. Any visible issues or damage
11. Any warnings or error codes displayed`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Identify all information about this HVAC system from the image. Focus on the data plate/label if visible. Return ONLY a JSON object with the following structure: {\"systemType\": \"...\", \"brand\": \"...\", \"model\": \"...\", \"serialNumber\": \"...\", \"manufacturingDate\": \"...\", \"capacity\": \"...\", \"efficiencyRating\": \"...\", \"estimatedAge\": \"...\", \"visibleCondition\": \"...\", \"visibleIssues\": \"...\", \"errorCodes\": \"...\"}. For any fields you cannot determine, use an empty string." 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`
              }
            }
          ]
        }
      ],
      max_tokens: 800
    });
    
    const responseText = completion.choices[0].message.content;
    
    try {
      // Extract JSON from response text with better error handling
      let systemInfo = extractSystemInfoFromResponse(responseText);
      
      console.log("Image analysis completed successfully");
      return res.json({ 
        systemInfo,
        rawAnalysis: responseText
      });
    } catch (parseError) {
      console.error("Error parsing image analysis response:", parseError);
      
      // Return a default empty response rather than crashing
      return res.status(422).json({
        error: "Could not parse system information from image",
        systemInfo: {
          brand: "",
          model: "",
          systemType: "",
          age: ""
        }
      });
    }
  } catch (error) {
    console.error('Image analysis error:', error);
    
    // Send a graceful error response
    return res.status(500).json({ 
      error: 'An error occurred while analyzing the image',
      details: error.message,
      systemInfo: {
        brand: "",
        model: "",
        systemType: "",
        age: ""
      }
    });
  }
});

// Helper function to extract system info from JSON response
function extractSystemInfoFromResponse(responseText) {
  try {
    // First, clean up the response text to ensure it's valid JSON
    let cleanedResponse = responseText
      .replace(/```json\s*/, '')  // Remove opening markdown code block
      .replace(/```\s*$/, '')     // Remove closing markdown code block
      .replace(/`/g, '');         // Remove any backticks
    
    // Try to parse as JSON - look for what looks like a JSON object
    const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If we can't find a JSON object, create a default one
    return {
      brand: "",
      model: "",
      systemType: "",
      age: ""
    };
  } catch (error) {
    console.error("JSON parsing error:", error);
    
    // Return default empty object on error
    return {
      brand: "",
      model: "",
      systemType: "",
      age: ""
    };
  }
}

// Helper function to construct the diagnostic prompt
function constructDiagnosticPrompt(systemType, systemInfo, symptoms) {
  let prompt = `## HVAC Diagnostic Request\n\n`;
  
  // System classification
  prompt += `### System Information\n`;
  prompt += `- **Type:** ${systemType}\n`;
  
  // Add system info if available
  if (systemInfo) {
    if (systemInfo.brand) prompt += `- **Brand:** ${systemInfo.brand}\n`;
    if (systemInfo.model) prompt += `- **Model:** ${systemInfo.model}\n`;
    if (systemInfo.age) prompt += `- **Age:** ${systemInfo.age}\n`;
    if (systemInfo.lastServiced) prompt += `- **Last Service:** ${systemInfo.lastServiced}\n`;
    if (systemInfo.tonnage) prompt += `- **Tonnage:** ${systemInfo.tonnage}\n`;
    if (systemInfo.fuelType) prompt += `- **Fuel Type:** ${systemInfo.fuelType}\n`;
    if (systemInfo.additionalInfo) prompt += `- **Additional Notes:** ${systemInfo.additionalInfo}\n`;
  }
  
  // Reported symptoms - this is crucial information
  prompt += `\n### Reported Symptoms\n${symptoms}\n\n`;
  
  // Clear diagnostic instructions with formatting guidance
  prompt += `## Diagnostic Instructions
Please provide a detailed HVAC diagnosis with the following sections:

1. **Primary Analysis:** Identify the most likely cause based on symptoms and system details.

2. **Possible Issues:** List potential issues in order of likelihood. For each issue, include:
   - Issue name
   - Severity (Low/Medium/High)
   - Brief description of the problem
   - Likelihood percentage (how probable this cause is)

3. **Troubleshooting Steps:** Provide specific steps for diagnosing and potentially fixing the issue.

4. **Required Tools and Parts:** List specific tools and replacement parts that may be needed.

5. **Repair Complexity:** Categorize as Easy (DIY), Moderate (Some technical knowledge required), or Complex (Professional recommended).

6. **Additional Notes:** Provide any relevant system-specific information.

Format your response in valid JSON using this structure:
{
  "primaryIssue": "Brief statement of most likely cause",
  "possibleIssues": [
    {
      "issue": "Issue name",
      "severity": "Low/Medium/High",
      "description": "Brief description",
      "likelihood": 80
    }
  ],
  "troubleshooting": [
    "Step 1: Detailed instruction",
    "Step 2: Detailed instruction"
  ],
  "requiredItems": [
    "Item 1",
    "Item 2"
  ],
  "repairComplexity": "Easy/Moderate/Complex",
  "additionalNotes": "Important information",
  "safetyWarnings": "Any critical safety considerations"
}`;

  return prompt;
}

// Process the OpenAI response
function processDiagnosisResult(content) {
  try {
    // Try to parse JSON response
    return JSON.parse(content);
  } catch (error) {
    console.error("Error parsing diagnosis result:", error);
    
    // Extract what we can from a text response
    return formatTextResponse(content);
  }
}

// Format text response if not in JSON format
function formatTextResponse(text) {
  // Default structure with empty fields
  const sections = {
    primaryIssue: "Could not determine primary issue",
    possibleIssues: [],
    troubleshooting: [],
    requiredItems: [],
    repairComplexity: "Unknown",
    additionalNotes: "The AI response could not be properly formatted. Please try again."
  };
  
  // Simple parsing logic
  if (text.includes("Possible Issues:")) {
    const issuesSection = text.split("Possible Issues:")[1].split("\n\n")[0];
    sections.possibleIssues = issuesSection.split("\n").map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      return { 
        issue: trimmedLine, 
        severity: "Unknown", 
        description: "",
        likelihood: 50
      };
    }).filter(Boolean); // Remove null entries
  }
  
  if (text.includes("Troubleshooting Steps:")) {
    const stepsSection = text.split("Troubleshooting Steps:")[1].split("\n\n")[0];
    sections.troubleshooting = stepsSection.split("\n").map(line => line.trim()).filter(Boolean);
  }
  
  return sections;
}

// Rule-based cost estimation function
function generateRuleBasedCostEstimates(diagnosisData) {
  const { possibleIssues, repairComplexity } = diagnosisData;
  
  // Base cost ranges by complexity
  const costRanges = {
    'Easy': { min: 100, max: 300 },
    'Moderate': { min: 250, max: 800 },
    'Complex': { min: 700, max: 2500 }
  };
  
  // Use the provided complexity or default to Moderate
  let complexity = repairComplexity || 'Moderate';
  let baseRange = costRanges[complexity] || costRanges['Moderate'];
  
  // Calculate parts and labor
  const partsCost = {
    min: Math.round(baseRange.min * 0.4),
    max: Math.round(baseRange.max * 0.4)
  };
  
  const laborCost = {
    min: Math.round(baseRange.min * 0.6),
    max: Math.round(baseRange.max * 0.6),
    hours: {
      min: Math.round(partsCost.min / 50),
      max: Math.round(partsCost.max / 50)
    }
  };
  
  // Generate line item estimates for each possible issue
  const lineItems = [];
  if (possibleIssues && possibleIssues.length > 0) {
    possibleIssues.forEach(issue => {
      // Factor in severity to the cost
      const severityMultiplier = {
        'Low': 0.7,
        'Medium': 1.0,
        'High': 1.3
      }[issue.severity] || 1.0;
      
      // Create a cost range for this specific issue
      const issueCost = {
        issue: issue.issue,
        costRange: {
          min: Math.round(baseRange.min * severityMultiplier * 0.5),
          max: Math.round(baseRange.max * severityMultiplier * 0.7)
        },
        description: issue.description || "Includes parts and labor for repair",
        diyFeasibility: complexity === 'Easy' ? 'Partial' : 'None'
      };
      
      lineItems.push(issueCost);
    });
  }
  
  // Generate total estimate
  const totalEstimate = {
    min: baseRange.min,
    max: baseRange.max
  };
  
  return {
    totalEstimate,
    partsCost,
    laborCost,
    lineItems,
    regionalAdjustments: {
      westCoast: 1.3,
      northeast: 1.25,
      midwest: 0.9,
      south: 0.85
    },
    warrantyConsiderations: "Parts may be covered under manufacturer warranty depending on age and warranty terms.",
    disclaimer: "These estimates are approximate and may vary based on your location, specific system model, and additional factors discovered during inspection."
  };
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log the error but don't crash the server
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the rejection but don't crash the server
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
