// server.js
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
// Heroku will assign a port via the PORT environment variable
// You don't need to specify port 3001 or any other specific port
const PORT = process.env.PORT || 3000; // Fallback to 3000 for local development

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString('base64');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an HVAC technician assistant that specializes in identifying HVAC systems from images. Extract model, brand, age, and other relevant details visible in the image."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify all visible information about this HVAC system. Look for brand name, model number, serial number, manufacturing date, tonnage, and any other specifications. Return the information in JSON format with the following structure: {\"brand\": \"...\", \"model\": \"...\", \"serialNumber\": \"...\", \"age\": \"...\", \"tonnage\": \"...\", \"additionalInfo\": \"...\"}. If you cannot determine a field, leave it as an empty string." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 800
    });
    onst responseText = completion.choices[0].message.content;
    
    // Try to parse JSON from response
    let systemInfo = {};
    try {
      // Extract JSON from response text (it might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                        responseText.match(/{[\s\S]*}/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      systemInfo = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error parsing JSON from OpenAI response:", parseError);
      
      // If parsing fails, use regex to extract information
      const brandMatch = responseText.match(/brand["\s:]+([^"}\s,]+)/i);
      const modelMatch = responseText.match(/model["\s:]+([^"}\s,]+)/i);
      
      systemInfo = {
        brand: brandMatch ? brandMatch[1] : "",
        model: modelMatch ? modelMatch[1] : "",
        age: "",
        tonnage: "",
        additionalInfo: "Information extracted from image analysis"
      };
    }
    
    // Return the extracted system information
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

// Middleware
app.use(cors());
app.use(express.json());

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
  let prompt = `Diagnose the following HVAC issue:\n\n`;
  
  prompt += `System Type: ${systemType}\n`;
  
  // Add system info details
  prompt += `System Information:\n`;
  for (const [key, value] of Object.entries(systemInfo)) {
    prompt += `- ${key}: ${value}\n`;
  }
  
  prompt += `\nSymptoms: ${symptoms}\n\n`;
  
  prompt += `Based on the information provided, please:
  1. Identify the most likely issues
  2. Rate the severity of each issue (Low, Medium, High)
  3. Provide step-by-step troubleshooting instructions
  4. List any required parts or tools
  5. Estimate the repair complexity (Easy, Moderate, Complex)
  
  Format your response in JSON with the following structure:
  {
    "possibleIssues": [
      {
        "issue": "Issue name",
        "severity": "Low/Medium/High",
        "description": "Brief description"
      }
    ],
    "troubleshooting": [
      "Step 1: ...",
      "Step 2: ...",
      ...
    ],
    "requiredItems": [
      "Item 1",
      "Item 2",
      ...
    ],
    "repairComplexity": "Easy/Moderate/Complex",
    "additionalNotes": "Any additional information"
  }`;
  
  return prompt;
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
  
  // Add more parsing logic as needed
  
  return sections;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
