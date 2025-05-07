// src/server/api.js (for Node.js server)
const express = require('express');
const { OpenAI } = require('openai');
const router = express.Router();
require('dotenv').config();

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint for HVAC diagnostic analysis
router.post('/diagnose', async (req, res) => {
  try {
    const { systemType, systemInfo, symptoms } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    // Construct a detailed prompt for the OpenAI model
    const prompt = constructDiagnosticPrompt(systemType, systemInfo, symptoms);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Or gpt-3.5-turbo depending on needs and budget
      messages: [
        {
          role: "system",
          content: "You are an expert HVAC technician assistant. Your job is to diagnose HVAC issues based on the symptoms provided and suggest possible solutions. Provide step-by-step troubleshooting instructions that are clear and concise."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // Lower temperature for more deterministic/factual responses
      max_tokens: 1000,
    });

    // Process the response
    const diagnosisResult = processDiagnosisResult(completion.choices[0].message.content);
    
    // Cache the result for offline use
    // This would be handled by the service worker
    
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

module.exports = router;
