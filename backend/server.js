// server.js - Complete file with image analysis feature
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
// Heroku will assign a port via the PORT environment variable
const PORT = process.env.PORT || 3000; // Fallback to 3000 for local development

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: ['https://hvac-ai-assistant.netlify.app', 'http://localhost:3000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,OPTIONS',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for image data

// Health check endpoint
app.get('/', (req, res) => {
  res.send('HVAC Diagnostics API is running');
});

// Diagnostic endpoint
app.post('/api/diagnose', async (req, res) => {
  try {
    const { systemType, systemInfo, symptoms } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    // Construct a detailed prompt for the OpenAI model
    const prompt = constructDiagnosticPrompt(systemType, systemInfo, symptoms);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using a faster model to reduce latency
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
    
    // Add cost estimates to the result
    diagnosisResult.costEstimates = await generateCostEstimates(diagnosisResult, systemInfo);
    
    return res.json(diagnosisResult);
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the diagnosis',
      details: error.message 
    });
  }
});

// Helper function to construct the diagnostic prompt
function constructDiagnosticPrompt(systemType, systemInfo, symptoms) {
  let prompt = `## HVAC Diagnostic Request\n\n`;
  
  // System classification
  prompt += `### System Information\n`;
  prompt += `- **Type:** ${systemType}\n`;
  prompt += `- **Brand:** ${systemInfo.brand || 'Unknown'}\n`;
  prompt += `- **Model:** ${systemInfo.model || 'Unknown'}\n`;
  prompt += `- **Age:** ${systemInfo.age || 'Unknown'}\n`;
  prompt += `- **Last Service:** ${systemInfo.lastServiced || 'Unknown'}\n`;
  
  // Additional system details
  if (systemInfo.tonnage) prompt += `- **Tonnage:** ${systemInfo.tonnage}\n`;
  if (systemInfo.fuelType) prompt += `- **Fuel Type:** ${systemInfo.fuelType}\n`;
  if (systemInfo.additionalInfo) prompt += `- **Additional Notes:** ${systemInfo.additionalInfo}\n`;
  
  // Reported symptoms - this is crucial information
  prompt += `\n### Reported Symptoms\n${symptoms}\n\n`;
  
  // Include seasonal context
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const season = currentMonth >= 5 && currentMonth <= 9 ? 'summer/cooling' : 'winter/heating';
  prompt += `### Seasonal Context\n- Current season: ${season} season\n\n`;
  
  // Add system-specific context
  prompt += getSystemSpecificContext(systemType, systemInfo);
  
  // Clear diagnostic instructions with formatting guidance
  prompt += `## Diagnostic Instructions
Please provide a detailed HVAC diagnosis with the following sections:

1. **Primary Analysis:** Identify the most likely cause based on symptoms and system details.

2. **Possible Issues:** List all potential issues in order of likelihood. For each issue, include:
   - Issue name
   - Severity (Low/Medium/High)
   - Brief description of the problem
   - Likelihood percentage (how probable this cause is)

3. **Troubleshooting Steps:** Provide specific, detailed steps for diagnosing and potentially fixing the issue. Include safety precautions.

4. **Required Tools and Parts:** List specific tools and replacement parts that may be needed.

5. **Repair Complexity:** Categorize as Easy (DIY), Moderate (Some technical knowledge required), or Complex (Professional recommended).

6. **Additional Notes:** Provide any relevant system-specific information, manufacturer-known issues, or seasonal considerations.

Format your response in valid JSON only. Respond with clean, parseable JSON using this structure:
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

// Helper function to get system-specific context
function getSystemSpecificContext(systemType, systemInfo) {
  // Add system-specific context to enhance the prompt
  switch(systemType) {
    case 'central-ac':
      return `
### System-Specific Context
This is a central air conditioning system diagnosis.
- Common issues include refrigerant leaks, dirty coils, clogged filters, and electrical problems.
- Check both indoor air handler and outdoor condensing unit.
- For ${systemInfo.brand || ''} units, pay special attention to the common failure points: 
  * Carrier: TXV valves, capacitor issues
  * Trane: Compressor relay problems
  * Lennox: Control board failures
- ${getAgeSpecificGuidance(systemInfo.age, 'central-ac')}`;
    
    case 'heat-pump':
      return `
### System-Specific Context
This is a heat pump system diagnosis.
- Consider both heating and cooling modes in diagnosis.
- Common issues include reversing valve failures, defrost control problems, and refrigerant leaks.
- Check for ice buildup on outdoor unit which indicates restricted airflow or refrigerant issues.
- ${getAgeSpecificGuidance(systemInfo.age, 'heat-pump')}`;
    
    case 'furnace':
      return `
### System-Specific Context
This is a ${systemInfo.fuelType || ''} furnace diagnosis.
- For gas furnaces, check ignition system, flame sensor, and gas valve.
- For electric furnaces, check heating elements and sequencers.
- Pay attention to safety devices like limit switches and pressure switches.
- ${getAgeSpecificGuidance(systemInfo.age, 'furnace')}`;
    
    default:
      return '';
  }
}

// Helper function for age-specific guidance
function getAgeSpecificGuidance(age, systemType) {
  // Provide age-specific guidance
  if (!age) return 'Age unknown - consider both wear-related and installation issues.';
  
  if (age === '0-5') {
    return 'New system - focus on installation issues, control settings, and manufacturing defects.';
  } else if (age === '6-10') {
    return 'Mid-life system - consider maintenance issues like dirty coils and worn capacitors.';
  } else if (age === '11-15') {
    return 'Aging system - wear items like capacitors, contactors, and motors are common failure points.';
  } else if (age === '16-20' || age === '20+') {
    return 'Older system - consider major component failure (compressor, heat exchanger) and refrigerant leaks due to corrosion.';
  }
  
  return '';
}

// Process the OpenAI response
function processDiagnosisResult(content) {
  try {
    // Try to parse JSON response
    return JSON.parse(content);
  } catch (error) {
    // If not valid JSON, structure the text response
    return {
      rawResponse: content,
      formattedResponse: formatTextResponse(content)
    };
  }
}

// Format text response if not in JSON format
function formatTextResponse(text) {
  // Split by common section indicators
  const sections = {
    possibleIssues: [],
    troubleshooting: [],
    requiredItems: [],
    repairComplexity: "Unknown",
    additionalNotes: ""
  };
  
  // Simple parsing logic - could be enhanced
  if (text.includes("Possible Issues:")) {
    const issuesSection = text.split("Possible Issues:")[1].split("\n\n")[0];
    sections.possibleIssues = issuesSection.split("\n").map(line => {
      return { issue: line.trim(), severity: "Unknown", description: "" };
    }).filter(item => item.issue);
  }
  
  if (text.includes("Troubleshooting Steps:")) {
    const stepsSection = text.split("Troubleshooting Steps:")[1].split("\n\n")[0];
    sections.troubleshooting = stepsSection.split("\n").map(line => line.trim()).filter(Boolean);
  }
  
  if (text.includes("Required Tools:") || text.includes("Required Items:")) {
    const toolsMarker = text.includes("Required Tools:") ? "Required Tools:" : "Required Items:";
    const toolsSection = text.split(toolsMarker)[1].split("\n\n")[0];
    sections.requiredItems = toolsSection.split("\n").map(line => line.trim()).filter(Boolean);
  }
  
  if (text.includes("Repair Complexity:")) {
    const complexityLine = text.split("Repair Complexity:")[1].split("\n")[0];
    if (complexityLine.toLowerCase().includes("easy")) sections.repairComplexity = "Easy";
    else if (complexityLine.toLowerCase().includes("moderate")) sections.repairComplexity = "Moderate";
    else if (complexityLine.toLowerCase().includes("complex")) sections.repairComplexity = "Complex";
  }
  
  if (text.includes("Additional Notes:")) {
    sections.additionalNotes = text.split("Additional Notes:")[1].split("\n\n")[0].trim();
  }
  
  return sections;
}

// Function to generate cost estimates using OpenAI
async function generateCostEstimates(diagnosisData, systemInfo) {
  try {
    let prompt = `## HVAC Repair Cost Estimation Request\n\n`;

    // Add location context if available
    if (systemInfo.location) {
      prompt += `### Location\n${systemInfo.location}\n\n`;
    }
    
    // Add system information
    prompt += `### System Information\n`;
    for (const [key, value] of Object.entries(systemInfo)) {
      if (value) prompt += `- **${key}:** ${value}\n`;
    }
    
    // Add diagnosis details with weighting for cost-relevant factors
    prompt += `\n### Diagnosis\n`;
    
    if (diagnosisData.primaryIssue) {
      prompt += `**Primary Issue:** ${diagnosisData.primaryIssue}\n\n`;
    }
    
    if (diagnosisData.possibleIssues && diagnosisData.possibleIssues.length > 0) {
      prompt += `**Possible Issues:**\n`;
      diagnosisData.possibleIssues.forEach(issue => {
        prompt += `- ${issue.issue} (Severity: ${issue.severity}, Likelihood: ${issue.likelihood || 'Unknown'}%)\n`;
        prompt += `  ${issue.description || ''}\n`;
      });
    }
    
    prompt += `\n**Repair Complexity:** ${diagnosisData.repairComplexity || 'Unknown'}\n`;
    
    if (diagnosisData.requiredItems && diagnosisData.requiredItems.length > 0) {
      prompt += `\n**Required Items:**\n`;
      diagnosisData.requiredItems.forEach(item => {
        prompt += `- ${item}\n`;
      });
    }
    
    // Current date for seasonal pricing
    const currentDate = new Date();
    prompt += `\n**Date:** ${currentDate.toISOString().split('T')[0]}\n`;
    const isHighSeason = currentDate.getMonth() >= 5 && currentDate.getMonth() <= 8; // June-September
    prompt += `**Season:** ${isHighSeason ? 'Peak HVAC season (higher demand)' : 'Off-peak HVAC season'}\n`;
    
    // Market data context
    prompt += `\n### Market Context\n`;
    prompt += `- Current refrigerant pricing trends: R-410A prices ${isHighSeason ? 'elevated' : 'stable'}\n`;
    prompt += `- Supply chain status: Parts for ${systemInfo.brand || 'most brands'} are generally available\n`;
    prompt += `- Labor rates: National average HVAC technician rate is $75-125/hour depending on location\n`;
    
    // Clear instructions
    prompt += `\n## Cost Estimation Instructions
As an HVAC cost estimation expert, provide a detailed breakdown of repair costs based on the diagnosis information.

Include the following in your estimation:

1. **Parts Cost Range:** Itemize major parts needed with individual price ranges
2. **Labor Cost Range:** Estimate hours needed and cost range based on typical HVAC labor rates
3. **Total Cost Range:** Provide low-end and high-end total cost estimates
4. **Line Item Breakdown:** For each possible issue, provide separate cost estimates
5. **Regional Adjustments:** Provide multipliers for different US regions
6. **DIY vs Professional:** Note which items could be DIY repairs vs requiring professional service
7. **Warranty Considerations:** Note any parts that might be under warranty based on system age

Consider these factors in your estimate:
- System age: ${systemInfo.age || 'Unknown'} (affects parts availability and likelihood of additional issues)
- Brand: ${systemInfo.brand || 'Unknown'} (affects parts pricing)
- Repair complexity: ${diagnosisData.repairComplexity || 'Moderate'} (affects labor hours)
- Season: ${isHighSeason ? 'Peak season pricing may apply' : 'Off-peak season'} (affects labor rates)

Format your response as a JSON object with the following structure:
{
  "totalEstimate": { "min": 000, "max": 000 },
  "partsCost": { "min": 000, "max": 000, "items": [{"name": "Part name", "min": 00, "max": 00}] },
  "laborCost": { "min": 000, "max": 000, "hours": {"min": 0, "max": 0} },
  "lineItems": [
    { 
      "issue": "Issue name", 
      "costRange": { "min": 000, "max": 000 },
      "description": "Brief description of what this cost includes",
      "diyFeasibility": "None/Partial/Complete"
    }
  ],
  "regionalAdjustments": {
    "westCoast": 1.3,
    "northeast": 1.25,
    "midwest": 0.9,
    "south": 0.85
  },
  "warrantyConsiderations": "Notes about potential warranty coverage",
  "disclaimer": "Detailed disclaimer text about estimate accuracy"
}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert HVAC cost estimator with 20+ years of experience in the field. You have deep knowledge of current market rates for parts and labor across different US regions. Your estimates are precise, justified by market data, and account for all relevant factors."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    // Parse the response
    const responseText = completion.choices[0].message.content;
    try {
      // Extract JSON from response text
      const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                       responseText.match(/{[\s\S]*}/);
                       
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error parsing cost estimate JSON:", parseError);
      
      // Fall back to rule-based estimation if JSON parsing fails
      return generateRuleBasedCostEstimates(diagnosisData);
    }
  } catch (error) {
    console.error("Error generating AI cost estimates:", error);
    
    // Fallback to rule-based method in case of API error
    return generateRuleBasedCostEstimates(diagnosisData);
  }
}

// Rule-based cost estimation as fallback
function generateRuleBasedCostEstimates(diagnosisData) {
  const { possibleIssues, repairComplexity } = diagnosisData;
  
  // Base cost ranges by complexity
  const costRanges = {
    'Easy': { min: 100, max: 300 },
    'Moderate': { min: 250, max: 800 },
    'Complex': { min: 700, max: 2500 }
  };
  
  // Adjust for system type and specific issues
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

// NEW: Image analysis endpoint
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        error: 'No image data provided'
      });
    }
    
    // Call OpenAI's GPT-4 Vision API for image analysis
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
    let systemInfo;
    
 try {
  // First, log the actual response to help debugging
  console.log("OpenAI Vision API raw response:", responseText.substring(0, 200) + "...");
  
  // Try to parse the JSON response
  let systemInfo;
  
  try {
    // First, clean up the response text to ensure it's valid JSON
    // Remove any backticks, code blocks or markdown formatting
    let cleanedResponse = responseText
      .replace(/```json\s*/, '')  // Remove opening markdown code block
      .replace(/```\s*$/, '')     // Remove closing markdown code block
      .replace(/`/g, '');         // Remove any backticks
      
    // Log the cleaned response for debugging
    console.log("Cleaned response:", cleanedResponse.substring(0, 200) + "...");
      
    // Try to parse as JSON - look for what looks like a JSON object
    const jsonMatch = cleanedResponse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      systemInfo = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON object found in response");
    }
  } catch (parseError) {
    console.error("Error parsing image analysis JSON:", parseError);
    console.log("Full response for debugging:", responseText);
    
    // If parsing fails, extract what we can with regex
    const brandMatch = responseText.match(/"brand":\s*"([^"]*)"/);
    const modelMatch = responseText.match(/"model":\s*"([^"]*)"/);
    
    systemInfo = {
      brand: brandMatch ? brandMatch[1] : "",
      model: modelMatch ? modelMatch[1] : "",
      systemType: "",
      serialNumber: "",
      manufacturingDate: "",
      capacity: "",
      efficiencyRating: "",
      estimatedAge: ""
    };
  }
    
    // Map any systemType values to match our application's types
    if (systemInfo.systemType) {
      const typeMap = {
        "central air conditioner": "central-ac",
        "central air conditioning": "central-ac",
        "heat pump": "heat-pump",
        "furnace": "furnace",
        "boiler": "boiler",
        "mini split": "mini-split",
        "ductless": "mini-split",
        "package unit": "package-unit",
        "packaged unit": "package-unit"
      };
      
      // Normalize the system type (lowercase and check for matches)
      const normalizedType = systemInfo.systemType.toLowerCase();
      for (const [key, value] of Object.entries(typeMap)) {
        if (normalizedType.includes(key)) {
          systemInfo.systemType = value;
          break;
        }
      }
    }
    
    // Convert estimatedAge to our app's format if possible
    if (systemInfo.estimatedAge) {
      const ageMatch = systemInfo.estimatedAge.match(/(\d+)/);
      if (ageMatch) {
        const age = parseInt(ageMatch[1]);
        if (age <= 5) systemInfo.age = "0-5";
        else if (age <= 10) systemInfo.age = "6-10";
        else if (age <= 15) systemInfo.age = "11-15";
        else if (age <= 20) systemInfo.age = "16-20";
        else systemInfo.age = "20+";
      }
    }
    
    return res.json({ 
      systemInfo,
      rawAnalysis: responseText
    });
    
  } catch (error) {
    console.error('Image analysis error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while analyzing the image',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
