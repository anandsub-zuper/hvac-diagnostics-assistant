// server.js - Complete file with fixed diagnosis endpoint AND enhanced image analysis
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
// Heroku will assign a port via the PORT environment variable
const PORT = process.env.PORT || 3000; // Fallback to 3000 for local development

// Configure OpenAI client
let openai;
try {
  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    console.error('WARNING: OPENAI_API_KEY environment variable is not set');
    // We'll handle this in the route handlers
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Error initializing OpenAI:', error);
  // Continue app startup even if OpenAI init fails
}

// Middleware
app.use(cors({
  origin: ['https://hvac-ai-assistant.netlify.app', 'http://localhost:3000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,OPTIONS',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for image data

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

// IMPROVED Diagnostic endpoint with better response formatting
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

    // Construct a clearer prompt that forces JSON output format
    const prompt = constructBetterDiagnosticPrompt(systemType, systemInfo, symptoms);
    
    // First try with gpt-4 for better structured output
    try {
      // Call OpenAI API with a model more capable of structured output
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview", // Try with a more capable model
        messages: [
          {
            role: "system",
            content: "You are an expert HVAC technician who always responds in valid JSON format. You diagnose HVAC issues based on symptoms and provide structured troubleshooting steps in valid JSON only."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }, // Force JSON response format
        temperature: 0.2,
        max_tokens: 800,
      });

      // Process the response
      const responseText = completion.choices[0].message.content;
      console.log("Raw diagnosis response:", responseText);
      
      try {
        // Parse the JSON response
        const diagnosisResult = JSON.parse(responseText);
        
        // Validate the structure and add default values for missing fields
        const validatedResult = validateAndFixDiagnosisResult(diagnosisResult);
        
        // Add cost estimates
        validatedResult.costEstimates = generateRuleBasedCostEstimates(validatedResult);
        validatedResult.source = 'ai';
        
        console.log("Diagnosis completed successfully");
        return res.json(validatedResult);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    } catch (gptError) {
      console.log("GPT-4 diagnosis failed, falling back to GPT-3.5:", gptError.message);
      
      // Fall back to GPT-3.5 with simplified prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Fallback to original model
        messages: [
          {
            role: "system",
            content: `You are an expert HVAC technician assistant. Your job is to diagnose HVAC issues based on symptoms and provide clear troubleshooting steps. ALWAYS reply with a valid JSON object containing primaryIssue, possibleIssues array, troubleshooting array, requiredItems array, repairComplexity, and additionalNotes.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      // Process the response with better error handling
      const responseText = completion.choices[0].message.content;
      console.log("GPT-3.5 raw diagnosis response:", responseText);
      
      const diagnosisResult = processDiagnosisResultImproved(responseText);
      
      // Add source and cost estimates
      diagnosisResult.source = 'ai';
      diagnosisResult.costEstimates = generateRuleBasedCostEstimates(diagnosisResult);
      
      return res.json(diagnosisResult);
    }
  } catch (error) {
    console.error('Diagnostic error:', error);
    
    // Send a more helpful error response with a pre-populated template
    return res.status(500).json({ 
      error: 'An error occurred while processing the diagnosis',
      details: error.message,
      primaryIssue: "Unable to determine due to processing error",
      possibleIssues: [
        {
          issue: "System diagnosis unavailable",
          severity: "Unknown",
          description: "The service encountered an error while analyzing your system",
          likelihood: 100
        }
      ],
      troubleshooting: [
        "Try again with a more detailed description of symptoms",
        "Check your internet connection and try again",
        "If the problem persists, consider using offline diagnosis mode"
      ],
      requiredItems: [],
      repairComplexity: "Unknown",
      additionalNotes: "The diagnostic service is experiencing technical difficulties. Please try again later.",
      source: "error"
    });
  }
});

// ENHANCED image analysis endpoint
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
    
    // Use enhanced image analysis
    try {
      const result = await enhancedImageAnalysis(image);
      return res.json(result);
    } catch (analysisError) {
      console.error('Enhanced image analysis error:', analysisError);
      
      // Fall back to basic image analysis if enhanced fails
      const basicResult = await basicImageAnalysis(image);
      return res.json({
        systemInfo: basicResult,
        rawAnalysis: "Enhanced analysis failed, using basic analysis instead."
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

// Enhanced image analysis function
async function enhancedImageAnalysis(imageBase64) {
  try {
    // First, use OpenAI to analyze the image
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert HVAC technician specializing in identifying HVAC equipment from images.
Extract as much information as possible about the system including:
1. System type (Central AC, Heat Pump, Furnace, Boiler, Mini-Split, etc.)
2. Brand/manufacturer (be precise and only name brands that are clearly visible)
3. Model information (exact numbers and letters visible on data plate)
4. Serial number (exact characters visible on data plate)
5. Manufacturing date (exactly as shown, or derived from serial number if possible)
6. System capacity/tonnage (BTU or tons, look for numbers like 24,000 BTU or 2 tons)
7. SEER/AFUE/HSPF rating (efficiency ratings, exact numbers as shown)
8. Refrigerant type (e.g., R-410A, R-22, etc.)

Focus on being extremely precise with model numbers, serial numbers, and other technical information.
If you cannot read certain digits or characters clearly, use "?" as a placeholder.
If you cannot determine certain information at all, simply respond with "none visible" for that field.

For serial numbers, they typically follow specific patterns by manufacturer:
- Carrier/Bryant: Usually 10-11 digits, where digits 4-5 indicate year of manufacture
- Trane/American Standard: Usually starts with a letter followed by digits where digits 1-2 indicate year
- Lennox: Usually 10-14 digits where digits 3-4 indicate year of manufacture
- Goodman: Usually numeric only, where the first or second digit often indicates decade of manufacture
- Rheem/Ruud: Usually starts with serial number or S/N, followed by alphanumeric code

For system age, examine serial number patterns or look for a manufacturing date which is often 
encoded in the serial number or shown separately on the data plate.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Identify all information about this HVAC system from the image. Focus specifically on the data plate/label and be precise with model and serial numbers. Return your findings in a JSON object with the following structure: {\"systemType\": \"...\", \"brand\": \"...\", \"model\": \"...\", \"serialNumber\": \"...\", \"manufacturingDate\": \"...\", \"capacity\": \"...\", \"efficiencyRating\": \"...\", \"refrigerantType\": \"...\"}" 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });
    
    // Get the raw text response
    const responseText = completion.choices[0].message.content;
    console.log("Raw image analysis:", responseText);
    
    // Extract basic system info from the response
    let basicSystemInfo = extractSystemInfoFromResponse(responseText);
    
    // Now enhance the data with more processing
    const enhancedSystemInfo = enhanceSystemInfo(basicSystemInfo, responseText);
    
    return {
      systemInfo: enhancedSystemInfo,
      rawAnalysis: responseText
    };
  } catch (error) {
    console.error('Enhanced image analysis error:', error);
    throw error;
  }
}

// Basic image analysis function as fallback
async function basicImageAnalysis(imageBase64) {
  // Call OpenAI's Vision API for basic image analysis
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert HVAC technician. Identify the HVAC system in this image.`
      },
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Identify the HVAC system in this image. Return ONLY a JSON object with the following structure: {\"systemType\": \"...\", \"brand\": \"...\", \"model\": \"...\", \"serialNumber\": \"...\", \"manufacturingDate\": \"...\", \"capacity\": \"...\", \"efficiencyRating\": \"...\", \"age\": \"...\"}. For any fields you cannot determine, use an empty string." 
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
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
    return extractSystemInfoFromResponse(responseText);
  } catch (parseError) {
    console.error("Error parsing image analysis response:", parseError);
    
    // Return a default empty response rather than crashing
    return {
      brand: "",
      model: "",
      systemType: "",
      age: ""
    };
  }
}

// Extract system info from OpenAI response
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
    
    // If we can't find a JSON object, extract key information using regex
    return extractInfoWithRegex(responseText);
  } catch (error) {
    console.error("JSON parsing error:", error);
    // Fall back to regex-based extraction
    return extractInfoWithRegex(responseText);
  }
}

// Extract information using regex patterns when JSON parsing fails
function extractInfoWithRegex(text) {
  const systemInfo = {
    systemType: "",
    brand: "",
    model: "",
    serialNumber: "",
    manufacturingDate: "",
    capacity: "",
    efficiencyRating: "",
    estimatedAge: "",
    refrigerantType: ""
  };
  
  // Extract brand
  const brandMatch = text.match(/brand:?\s*([A-Za-z0-9\s-]+)/i);
  if (brandMatch && brandMatch[1]) {
    systemInfo.brand = brandMatch[1].trim();
  }
  
  // Extract model
  const modelMatch = text.match(/model:?\s*([A-Za-z0-9\s-]+)/i);
  if (modelMatch && modelMatch[1]) {
    systemInfo.model = modelMatch[1].trim();
  }
  
  // Extract system type
  const typeMatch = text.match(/system\s*type:?\s*([A-Za-z0-9\s-]+)/i);
  if (typeMatch && typeMatch[1]) {
    systemInfo.systemType = typeMatch[1].trim();
  }
  
  // Extract serial number
  const serialMatch = text.match(/serial\s*number:?\s*([A-Za-z0-9\s-]+)/i);
  if (serialMatch && serialMatch[1]) {
    systemInfo.serialNumber = serialMatch[1].trim();
  }
  
  // Extract manufacturing date
  const dateMatch = text.match(/manufacturing\s*date:?\s*([A-Za-z0-9\s-\/,]+)/i);
  if (dateMatch && dateMatch[1]) {
    systemInfo.manufacturingDate = dateMatch[1].trim();
  }
  
  // Extract capacity
  const capacityMatch = text.match(/capacity:?\s*([0-9.,]+\s*(?:tons?|BTU))/i);
  if (capacityMatch && capacityMatch[1]) {
    systemInfo.capacity = capacityMatch[1].trim();
  }
  
  // Extract efficiency rating
  const efficiencyMatch = text.match(/efficiency\s*rating:?\s*([A-Za-z0-9\s-%.]+)/i);
  if (efficiencyMatch && efficiencyMatch[1]) {
    systemInfo.efficiencyRating = efficiencyMatch[1].trim();
  }
  
  return systemInfo;
}

// Enhance system info with additional processing
function enhanceSystemInfo(basicInfo, rawText) {
  // Create a copy of the basic info to enhance
  const enhancedInfo = { ...basicInfo };
  
  // 1. Normalize system type
  enhancedInfo.systemType = normalizeSystemType(enhancedInfo.systemType);
  
  // 2. Extract or enhance serial number
  if (!enhancedInfo.serialNumber || enhancedInfo.serialNumber.length < 5) {
    enhancedInfo.serialNumber = extractSerialNumber(rawText, enhancedInfo.brand);
  }
  
  // 3. Determine system age if not provided
  if (!enhancedInfo.estimatedAge) {
    enhancedInfo.estimatedAge = determineSystemAge(
      enhancedInfo.serialNumber, 
      enhancedInfo.manufacturingDate,
      enhancedInfo.brand
    );
  }
  
  // 4. Extract tonnage/capacity if not provided or standardize format
  if (!enhancedInfo.capacity) {
    enhancedInfo.capacity = detectSystemSize(enhancedInfo.model, rawText);
  } else {
    // Standardize tonnage format
    enhancedInfo.capacity = standardizeTonnage(enhancedInfo.capacity);
  }
  
  // 5. Normalize efficiency rating format
  if (enhancedInfo.efficiencyRating) {
    enhancedInfo.efficiencyRating = normalizeEfficiencyRating(enhancedInfo.efficiencyRating);
  }
  
  // 6. Format for frontend expectations
  return formatForFrontend(enhancedInfo);
}

// Standardize system type to match frontend expectations
function normalizeSystemType(systemType) {
  if (!systemType) return "";
  
  const typeMap = {
    "central air conditioner": "central-ac",
    "central air conditioning": "central-ac",
    "central ac": "central-ac",
    "split system": "central-ac",
    "heat pump": "heat-pump",
    "furnace": "furnace",
    "boiler": "boiler",
    "mini split": "mini-split",
    "minisplit": "mini-split",
    "ductless": "mini-split",
    "package unit": "package-unit",
    "packaged unit": "package-unit",
    "rooftop unit": "package-unit",
    "rtu": "package-unit"
  };
  
  // Normalize the system type (lowercase and check for matches)
  const normalizedType = systemType.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (normalizedType.includes(key)) {
      return value;
    }
  }
  
  return systemType; // Return original if no match
}

// Extract serial number with brand-specific patterns
function extractSerialNumber(text, brand) {
  // First check for explicit serial number mention
  const explicitMatch = text.match(/serial\s*(?:number|no|#)?\s*(?:is|:)?\s*[\"']?([A-Z0-9]{5,20})[\"']?/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1];
  }
  
  // Brand-specific serial number patterns
  const brandLower = (brand || "").toLowerCase();
  
  if (brandLower.includes("carrier") || brandLower.includes("bryant")) {
    const carrierMatch = text.match(/\b([0-9]{8,11})\b/i);
    if (carrierMatch) return carrierMatch[1];
  }
  
  if (brandLower.includes("trane") || brandLower.includes("american standard")) {
    const traneMatch = text.match(/\b([A-Z][0-9]{8,12})\b/i);
    if (traneMatch) return traneMatch[1];
  }
  
  if (brandLower.includes("lennox")) {
    const lennoxMatch = text.match(/\b([0-9]{10,14})\b/i);
    if (lennoxMatch) return lennoxMatch[1];
  }
  
  if (brandLower.includes("goodman") || brandLower.includes("amana")) {
    const goodmanMatch = text.match(/\b([0-9]{9,14})\b/i);
    if (goodmanMatch) return goodmanMatch[1];
  }
  
  if (brandLower.includes("rheem") || brandLower.includes("ruud")) {
    const rheemMatch = text.match(/\b([A-Z][0-9]{8,13})\b/i);
    if (rheemMatch) return rheemMatch[1];
  }
  
  // Generic pattern for other brands
  const genericMatch = text.match(/\b(?:serial|s\/n)(?:\s|#|:|\.|number)+\s*([A-Z0-9]{5,20})\b/i);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }
  
  return "";
}

// Determine system age from serial number/manufacturing date
function determineSystemAge(serialNumber, manufacturingDate, brand) {
  // First try to extract year from manufacturing date
  let manufacturingYear = null;
  
  if (manufacturingDate) {
    // Try to extract a 4-digit year
    const yearMatch = manufacturingDate.match(/(19|20)[0-9]{2}/);
    if (yearMatch) {
      manufacturingYear = parseInt(yearMatch[0]);
    }
    // Try to extract month/year format
    else {
      const monthYearMatch = manufacturingDate.match(/([0-9]{1,2})[\/-]([0-9]{2,4})/);
      if (monthYearMatch && monthYearMatch[2]) {
        let year = parseInt(monthYearMatch[2]);
        if (year < 100) {
          // Add century
          year += year > 50 ? 1900 : 2000;
        }
        manufacturingYear = year;
      }
    }
  }
  
  // If no manufacturing year found, try to extract from serial number
  if (!manufacturingYear && serialNumber) {
    const brandLower = (brand || "").toLowerCase();
    
    // Brand-specific serial number age extraction
    if (brandLower.includes("carrier") || brandLower.includes("bryant")) {
      // Carrier/Bryant: 4th and 5th digits often represent year
      if (serialNumber.length >= 5) {
        const yearDigits = serialNumber.substring(3, 5);
        if (/^[0-9]{2}$/.test(yearDigits)) {
          let year = parseInt(yearDigits);
          // Determine century (19xx or 20xx)
          year += year > 50 ? 1900 : 2000;
          manufacturingYear = year;
        }
      }
    }
    else if (brandLower.includes("trane") || brandLower.includes("american standard")) {
      // Trane: First digit after letter is decade, second is year in decade
      if (serialNumber.length >= 3 && /^[A-Z][0-9]{2}/.test(serialNumber)) {
        const decadeDigit = parseInt(serialNumber.charAt(1));
        const yearDigit = parseInt(serialNumber.charAt(2));
        const decade = decadeDigit < 8 ? 2000 + (decadeDigit * 10) : 1900 + (decadeDigit * 10);
        manufacturingYear = decade + yearDigit;
      }
    }
    else if (brandLower.includes("lennox")) {
      // Lennox: Digits 3-4 often represent year
      if (serialNumber.length >= 4) {
        const yearDigits = serialNumber.substring(2, 4);
        if (/^[0-9]{2}$/.test(yearDigits)) {
          let year = parseInt(yearDigits);
          // Determine century (19xx or 20xx)
          year += year > 50 ? 1900 : 2000;
          manufacturingYear = year;
        }
      }
    }
    // Add more brand-specific logic as needed
  }
  
  // Convert manufacturing year to age range
  if (manufacturingYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - manufacturingYear;
    
    // Return age in standardized format
    if (age <= 5) return "0-5";
    if (age <= 10) return "6-10";
    if (age <= 15) return "11-15";
    if (age <= 20) return "16-20";
    return "20+";
  }
  
  return "";
}

// Detect system size/tonnage
function detectSystemSize(modelNumber, rawText) {
  // First check for explicit tonnage mentions
  const tonnageMatch = rawText.match(/\b([1-6](?:\.[05])?)\s*tons?\b/i);
  if (tonnageMatch && tonnageMatch[1]) {
    return tonnageMatch[1];
  }
  
  // Check for BTU values and convert to tonnage
  const btuMatch = rawText.match(/\b([1-9][0-9],?000)\s*BTU\b/i);
  if (btuMatch && btuMatch[1]) {
    const btu = parseInt(btuMatch[1].replace(',', ''));
    const tonnage = Math.round((btu / 12000) * 10) / 10; // Convert BTU to tons
    return tonnage.toString();
  }
  
  // Check for model number patterns that indicate tonnage
  if (modelNumber) {
    // Common patterns: 024 = 2 tons, 036 = 3 tons, 048 = 4 tons, 060 = 5 tons
    const sizeCodeMatch = modelNumber.match(/\b(018|024|030|036|042|048|060)\b/);
    if (sizeCodeMatch && sizeCodeMatch[1]) {
      const sizeCode = sizeCodeMatch[1];
      const tonnageMap = {
        "018": "1.5",
        "024": "2",
        "030": "2.5",
        "036": "3",
        "042": "3.5",
        "048": "4",
        "060": "5"
      };
      if (tonnageMap[sizeCode]) {
        return tonnageMap[sizeCode];
      }
    }
    
    // Look for direct tonnage indication in model number
    const directTonnageMatch = modelNumber.match(/\b([1-5])(?:T|TON)\b/i);
    if (directTonnageMatch && directTonnageMatch[1]) {
      return directTonnageMatch[1];
    }
  }
  
  return "";
}

// Standardize tonnage format
function standardizeTonnage(tonnage) {
  if (!tonnage) return "";
  
  // Remove any non-numeric or decimal characters
  let cleanTonnage = tonnage.toString().replace(/[^0-9.]/g, '');
  
  // Convert BTU to tons if necessary
  if (tonnage.toString().toLowerCase().includes('btu')) {
    const btuMatch = tonnage.match(/([0-9,.]+)/);
    if (btuMatch && btuMatch[1]) {
      const btu = parseInt(btuMatch[1].replace(/[^0-9]/g, ''));
      if (btu > 0) {
        const tons = Math.round((btu / 12000) * 10) / 10;
        return tons.toString();
      }
    }
  }
  
  return cleanTonnage || "";
}

// Normalize efficiency rating format
function normalizeEfficiencyRating(rating) {
  if (!rating) return "";
  
  // Standardize SEER format
  if (rating.toUpperCase().includes('SEER')) {
    const seerMatch = rating.match(/([0-9.]+)\s*SEER/i);
    if (seerMatch && seerMatch[1]) {
      return `SEER ${seerMatch[1]}`;
    }
  }
  
  // Standardize AFUE format
  if (rating.toUpperCase().includes('AFUE')) {
    const afueMatch = rating.match(/([0-9.]+)%?\s*AFUE/i);
    if (afueMatch && afueMatch[1]) {
      return `AFUE ${afueMatch[1]}%`;
    }
  }
  
  // Standardize HSPF format
  if (rating.toUpperCase().includes('HSPF')) {
    const hspfMatch = rating.match(/([0-9.]+)\s*HSPF/i);
    if (hspfMatch && hspfMatch[1]) {
      return `HSPF ${hspfMatch[1]}`;
    }
  }
  
  return rating;
}

// Format system info for frontend expectations
function formatForFrontend(enhancedInfo) {
  const formattedInfo = { ...enhancedInfo };
  
  // Map system type to frontend codes
  if (formattedInfo.systemType) {
    formattedInfo.systemType = normalizeSystemType(formattedInfo.systemType);
  }
  
  // Map estimated age to frontend age ranges
  if (formattedInfo.estimatedAge && !formattedInfo.age) {
    formattedInfo.age = formattedInfo.estimatedAge;
  }
  
  // Map tonnage/capacity to frontend tonnage
  if (formattedInfo.capacity) {
    formattedInfo.tonnage = standardizeTonnage(formattedInfo.capacity);
  }
  
  return formattedInfo;
}

// Improved prompt constructor that forces JSON structure
function constructBetterDiagnosticPrompt(systemType, systemInfo, symptoms) {
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
  
  // Include seasonal context
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const season = currentMonth >= 5 && currentMonth <= 9 ? 'summer/cooling' : 'winter/heating';
  prompt += `### Seasonal Context\n- Current season: ${season} season\n\n`;
  
  // Clear diagnostic instructions with formatting guidance
  prompt += `## Diagnostic Instructions

Based on the system information and symptoms provided, please provide a detailed HVAC diagnosis.

YOU MUST REPLY WITH A VALID JSON OBJECT in the following exact structure:
{
  "primaryIssue": "Brief statement of most likely cause",
  "possibleIssues": [
    {
      "issue": "Issue name",
      "severity": "Low/Medium/High",
      "description": "Brief description",
      "likelihood": 80
    },
    {
      "issue": "Secondary issue name",
      "severity": "Low/Medium/High",
      "description": "Brief description",
      "likelihood": 60
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
}

Your response MUST be a VALID JSON object with AT LEAST the following fields:
- primaryIssue (string)
- possibleIssues (array of objects)
- troubleshooting (array of strings)
- requiredItems (array of strings)
- repairComplexity (string)
- additionalNotes (string)

Each possibleIssue MUST include:
- issue (string)
- severity (string - must be "Low", "Medium", or "High")
- description (string)
- likelihood (number between 1-100)

For possibleIssues, include at least 2-3 potential causes. For troubleshooting, include at least 3-5 specific steps.`;

  return prompt;
}

// New improved response processor
function processDiagnosisResultImproved(content) {
  try {
    // First try standard JSON parsing
    return JSON.parse(content);
  } catch (error) {
    console.error("JSON parsing error in diagnosis result:", error);
    
    // Try to extract JSON from a markdown code block
    const jsonBlockMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (blockError) {
        console.error("Failed to parse JSON from code block:", blockError);
      }
    }
    
    // Try to extract any JSON-like object
    const jsonObjectMatch = content.match(/{[\s\S]*?}/);
    if (jsonObjectMatch) {
      try {
        // Clean up the matched text by removing common issues
        const cleanedJson = jsonObjectMatch[0]
          .replace(/(\w+):/g, '"$1":') // Add quotes to keys
          .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
          
        return JSON.parse(cleanedJson);
      } catch (objectError) {
        console.error("Failed to parse extracted JSON-like object:", objectError);
      }
    }
    
    // As a last resort, use text-based extraction
    return formatTextResponseBetter(content);
  }
}

// Improved text response formatter
function formatTextResponseBetter(text) {
  // Default structure with empty fields
  const sections = {
    primaryIssue: "Could not determine primary issue",
    possibleIssues: [],
    troubleshooting: [],
    requiredItems: [],
    repairComplexity: "Unknown",
    additionalNotes: "The diagnosis could not be properly formatted. Please try again with more detailed symptoms."
  };
  
  // Check for primary issue
  const primaryMatch = text.match(/(?:primary|main|likely)\s+(?:issue|problem|cause):?\s*([^\n.]+)/i);
  if (primaryMatch && primaryMatch[1]) {
    sections.primaryIssue = primaryMatch[1].trim();
  }
  
  // Extract possible issues
  let possibleIssues = [];
  
  // Look for structured issue lists with severity indicators
  const issueBlockMatch = text.match(/possible issues:[\s\S]*?(?=\n\n|\ntroubl)/i);
  if (issueBlockMatch) {
    const issueBlock = issueBlockMatch[0];
    const issueLines = issueBlock.split("\n").slice(1); // Skip the header
    
    issueLines.forEach(line => {
      const lineText = line.trim();
      if (!lineText) return;
      
      // Try to extract severity and description
      const issueSeverityMatch = lineText.match(/^(?:[0-9]\.|\*|-|•)?\s*([^:]+)(?::|\s*-)\s*(?:\(([^\)]+)\))?\s*(.+)?$/);
      if (issueSeverityMatch) {
        const issueName = issueSeverityMatch[1]?.trim() || "Unknown issue";
        let severity = "Medium"; // Default
        let description = issueSeverityMatch[3]?.trim() || "";
        
        // Try to determine severity
        if (issueSeverityMatch[2]) {
          const sevText = issueSeverityMatch[2].toLowerCase();
          if (sevText.includes("high") || sevText.includes("critical") || sevText.includes("severe")) {
            severity = "High";
          } else if (sevText.includes("low") || sevText.includes("minor")) {
            severity = "Low";
          }
        } else if (description.toLowerCase().includes("serious") || description.toLowerCase().includes("immediate")) {
          severity = "High";
        } else if (description.toLowerCase().includes("minor") || description.toLowerCase().includes("simple")) {
          severity = "Low";
        }
        
        // Calculate a rough likelihood
        let likelihood = 80;
        if (possibleIssues.length > 0) {
          likelihood = Math.max(30, 80 - (possibleIssues.length * 15));
        }
        
        possibleIssues.push({
          issue: issueName,
          severity: severity,
          description: description || `${issueName} may be causing the problem`,
          likelihood: likelihood
        });
      } else if (lineText.length > 5 && !lineText.startsWith("=")) {
        // Simple fallback for unstructured lines
        possibleIssues.push({
          issue: lineText,
          severity: "Medium",
          description: "",
          likelihood: 50
        });
      }
    });
  }
  
  // If we couldn't find structured issues, try simpler patterns
  if (possibleIssues.length === 0) {
    // Look for lines with "issue", "problem", "malfunction" etc.
    const simpleIssueMatches = text.match(/(?:issue|problem|malfunction|failure|fault)[^\n.]*?(?=\n|$)/gi);
    if (simpleIssueMatches) {
      simpleIssueMatches.forEach((match, index) => {
        possibleIssues.push({
          issue: match.trim(),
          severity: "Medium", 
          description: "",
          likelihood: Math.max(30, 80 - (index * 20))
        });
      });
    }
  }
  
  sections.possibleIssues = possibleIssues;
  
  // Extract troubleshooting steps
  const troubleMatch = text.match(/(?:troubleshooting|steps|how to fix|resolution)[^\n]*:?([\s\S]*?)(?=\n\n|required|repair complexity|repair difficulty|additional notes|safety|$)/i);
  if (troubleMatch && troubleMatch[1]) {
    const steps = troubleMatch[1].split(/\n/)
      .map(step => step.trim())
      .filter(step => step.length > 0 && !step.match(/^troubleshooting|^steps|^here's how|^how to/i))
      .map(step => {
        // Remove leading numbers, bullets, etc.
        return step.replace(/^[0-9]+[\.\)]\s*|\-\s*|\*\s*|•\s*/, '');
      });
    sections.troubleshooting = steps;
  }
  
  // Extract required tools/items
  const toolsMatch = text.match(/(?:required|necessary|needed|tools|parts|equipment)[^\n]*:?([\s\S]*?)(?=\n\n|repair complexity|repair difficulty|additional|safety|$)/i);
  if (toolsMatch && toolsMatch[1]) {
    const items = toolsMatch[1].split(/\n/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && !item.match(/^required|^tools|^parts|^items|^materials/i))
      .map(item => {
        // Remove leading bullets, etc.
        return item.replace(/^[0-9]+[\.\)]\s*|\-\s*|\*\s*|•\s*/, '');
      });
    sections.requiredItems = items;
  }
  
  // Determine repair complexity
  if (text.match(/complex|difficult|professional|hvac technician required/i)) {
    sections.repairComplexity = "Complex";
  } else if (text.match(/moderate|intermediate|some experience|technical knowledge/i)) {
    sections.repairComplexity = "Moderate";
  } else if (text.match(/easy|simple|basic|diy/i)) {
    sections.repairComplexity = "Easy";
  }
  
  // Extract additional notes
  const notesMatch = text.match(/(?:additional notes|note|important|caution)[^\n]*:?([\s\S]*?)(?=\n\n|safety|conclusion|$)/i);
  if (notesMatch && notesMatch[1]) {
    sections.additionalNotes = notesMatch[1].trim();
  }
  
  // Extract safety warnings
  const safetyMatch = text.match(/(?:safety|warning|caution|danger)[^\n]*:?([\s\S]*?)(?=\n\n|conclusion|$)/i);
  if (safetyMatch && safetyMatch[1]) {
    sections.safetyWarnings = safetyMatch[1].trim();
  }
  
  return sections;
}

// Function to validate and fix the diagnosis result structure
function validateAndFixDiagnosisResult(result) {
  // Create a template with default values
  const template = {
    primaryIssue: "Unknown issue",
    possibleIssues: [],
    troubleshooting: [],
    requiredItems: [],
    repairComplexity: "Unknown",
    additionalNotes: ""
  };
  
  // Merge the result with the template
  const validatedResult = { ...template, ...result };
  
  // Ensure possibleIssues is an array with required properties
  if (!Array.isArray(validatedResult.possibleIssues)) {
    validatedResult.possibleIssues = [];
  }
  
  // Fix each possible issue
  validatedResult.possibleIssues = validatedResult.possibleIssues.map(issue => {
    // Create an issue template
    const issueTemplate = {
      issue: "Unknown issue",
      severity: "Medium",
      description: "",
      likelihood: 50
    };
    
    // Return the merged issue
    return { ...issueTemplate, ...issue };
  });
  
  // Ensure troubleshooting is an array
  if (!Array.isArray(validatedResult.troubleshooting)) {
    validatedResult.troubleshooting = [];
  }
  
  // Ensure requiredItems is an array
  if (!Array.isArray(validatedResult.requiredItems)) {
    validatedResult.requiredItems = [];
  }
  
  // Validate repairComplexity
  if (!["Easy", "Moderate", "Complex", "Unknown"].includes(validatedResult.repairComplexity)) {
    validatedResult.repairComplexity = "Unknown";
  }
  
  return validatedResult;
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
