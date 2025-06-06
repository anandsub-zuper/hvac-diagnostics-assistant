// src/components/DiagnosticForm.js
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

// Styled components
const FormContainer = styled.div`
  margin-bottom: 20px;
`;

const FormTitle = styled.h2`
  margin-bottom: 20px;
  color: #2c3e50;
`;

const FormDescription = styled.p`
  margin-bottom: 20px;
  color: #7f8c8d;
  line-height: 1.5;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const Button = styled.button`
  background-color: ${props => props.primary ? '#3498db' : '#e0e0e0'};
  color: ${props => props.primary ? 'white' : '#333'};
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: ${props => props.primary ? '#2980b9' : '#d0d0d0'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SelectionCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #3498db;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  min-height: 100px;
`;

const FieldHelper = styled.small`
  display: block;
  margin-top: 5px;
  color: #7f8c8d;
`;

const QuickActionCard = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 18px;
`;

const CardDescription = styled.p`
  margin-bottom: 15px;
  color: #7f8c8d;
`;

const ToggleContainer = styled.div`
  margin: 15px 0;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
`;

const ToggleButton = styled.span`
  display: flex;
  align-items: center;
  color: #3498db;
  font-weight: bold;
  
  &:before {
    content: ${props => props.open ? '"↑"' : '"↓"'};
    margin-right: 5px;
  }
`;

// Camera components
const CameraContainer = styled.div`
  margin-bottom: 20px;
`;

const VideoPreview = styled.video`
  width: 100%;
  max-width: 500px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f0f0f0;
  min-height: 300px; /* Ensure there's space for the video */
  object-fit: cover;
`;

const ImagePreview = styled.img`
  width: 100%;
  max-width: 500px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const StatusMessage = styled.div`
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => props.success ? '#d4edda' : props.error ? '#f8d7da' : props.warning ? '#fff3cd' : '#cce5ff'};
  color: ${props => props.success ? '#155724' : props.error ? '#721c24' : props.warning ? '#856404' : '#004085'};
`;

const DetectedInfo = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  border-radius: 4px;
`;

const CameraPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 500px;
  height: 300px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #666;
  text-align: center;
  padding: 20px;
  cursor: pointer;
`;

const CameraIcon = styled.div`
  font-size: 48px;
  margin-bottom: 15px;
  color: #aaa;
`;

const RotateTip = styled.div`
  background-color: rgba(52, 152, 219, 0.1);
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 14px;
  color: #2980b9;
  display: flex;
  align-items: center;
`;

const TipIcon = styled.span`
  margin-right: 8px;
  font-size: 18px;
`;

const ManualEntryButton = styled.button`
  background-color: transparent;
  color: #3498db;
  border: none;
  padding: 5px;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
  margin-top: 10px;
  
  &:hover {
    color: #2980b9;
  }
`;

const ManualEntryForm = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #eee;
`;

const FormRow = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  
  th, td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }
  
  th {
    font-weight: bold;
    color: #2c3e50;
  }
`;

const MissingInfo = styled.span`
  color: #e74c3c;
  font-style: italic;
`;

// Helper function to try to extract serial number from raw analysis text
function extractSerialNumberClientSide(text, brand) {
  if (!text) return "";
  
  // Try to find explicit mentions of serial number
  const explicitPatterns = [
    /serial\s*(?:number|no|#)?\s*(?:is|:)?\s*[\"']?([A-Z0-9]{5,20})[\"']?/i,
    /S\/N\s*[:.]?\s*([A-Z0-9]{5,20})/i,
    /SN\s*[:.]?\s*([A-Z0-9]{5,20})/i
  ];
  
  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  
  // If we have a Lennox unit, try Lennox-specific patterns
  if (brand && brand.toLowerCase().includes("lennox")) {
    const lennoxPatterns = [
      /\b(5[0-9]{9,13})\b/i,                  // Often starts with 5
      /\b([0-9]{10,14})\b/i,                  // Basic 10-14 digit format
      /\b([0-9]{3}[A-Z][0-9]{6,10})\b/i       // Sometimes has a letter in 4th position
    ];
    
    for (const pattern of lennoxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1].trim();
    }
  }
  
  return "";
}

// Enhanced CameraCapture component with better data transfer
const CameraCapture = ({ onImageCaptured, onSystemInfoDetected }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    serialNumber: '',
    age: '',
    lastServiced: '',
    tonnage: ''
  });
  
  // Detect if we're on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  const fileInputRef = useRef(null);
  
  // API URL from environment or default
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

  // Add reset function to clear all state when starting a new capture
  const resetCaptureState = () => {
    setCapturedImage(null);
    setAnalysisStatus(null);
    setDetectedInfo(null);
    setCameraError(null);
    setShowTips(false);
    setShowManualEntry(false);
    setManualEntryData({
      serialNumber: '',
      age: '',
      lastServiced: '',
      tonnage: ''
    });
    
    // Also clear file input if it exists
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection (from camera or gallery)
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCameraError("No image was captured");
      return;
    }
    
    try {
      // Read the selected file
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result;
        if (typeof imageDataUrl === 'string') {
          setCapturedImage(imageDataUrl);
          setShowTips(true);
          
          // Pass image to parent if needed
          if (onImageCaptured) {
            onImageCaptured(imageDataUrl);
          }
        } else {
          setCameraError("Unable to process the captured image");
        }
      };
      
      reader.onerror = () => {
        setCameraError("Error reading the captured image");
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing image:", err);
      setCameraError(`Error processing image: ${err.message}`);
    }
  };
  
  // Update takePicture to first reset state
  const takePicture = () => {
    // Clear all previous data first
    resetCaptureState();
    
    // Then trigger the file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Reset and retake
  const retakePhoto = () => {
    resetCaptureState();
  };
  
  // Analyze image - Enhanced version
  const analyzeImage = async () => {
    if (!capturedImage) {
      setCameraError("No image to analyze");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisStatus({
      type: 'info',
      message: "Analyzing image... This may take a few seconds"
    });
    
    try {
      // Extract base64 data
      const base64Data = capturedImage.split(',')[1];
      
      // Send to backend
      const response = await axios.post(`${API_URL}/api/analyze-image`, {
        image: base64Data
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });
      
      if (response.data && response.data.systemInfo) {
        const systemInfo = response.data.systemInfo;
        
        // Try to enhance the serial number detection using the raw analysis text
        if ((!systemInfo.serialNumber || systemInfo.serialNumber === "") && response.data.rawAnalysis) {
          // Look for serial number in the raw text from the AI
          const extractedSerialNumber = extractSerialNumberClientSide(
            response.data.rawAnalysis, 
            systemInfo.brand
          );
          
          if (extractedSerialNumber && extractedSerialNumber.length > 4) {
            console.log("Enhanced serial number detection:", extractedSerialNumber);
            systemInfo.serialNumber = extractedSerialNumber;
          }
        }
        
        setDetectedInfo(systemInfo);
        
        // Check for missing information
        const missingFields = [];
        if (!systemInfo.serialNumber) missingFields.push("serial number");
        if (!systemInfo.age && !systemInfo.estimatedAge) missingFields.push("age");
        if (!systemInfo.lastServiced) missingFields.push("service history");
        if (!systemInfo.tonnage && !systemInfo.capacity) missingFields.push("system size");
        
        // Set appropriate status message
        if (missingFields.length > 0) {
          setAnalysisStatus({
            type: 'warning',
            message: `System detected but we couldn't identify: ${missingFields.join(", ")}. You can enter this manually.`
          });
          setShowManualEntry(true);
        } else {
          setAnalysisStatus({
            type: 'success',
            message: "System information successfully detected!"
          });
          
          // Pass to parent immediately only if no missing information
          if (onSystemInfoDetected) {
            onSystemInfoDetected(systemInfo);
          }
        }
      } else {
        throw new Error("Invalid response from image analysis");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysisStatus({
        type: 'error',
        message: "Failed to analyze image. Please try again or enter details manually."
      });
      setShowManualEntry(true);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle manual entry changes
  const handleManualEntryChange = (e) => {
    const { name, value } = e.target;
    setManualEntryData({
      ...manualEntryData,
      [name]: value
    });
  };
  
  // Submit combined data (detected + manual) - FIXED VERSION
  const submitCombinedData = () => {
    // Log the detected info BEFORE mapping
    console.log("PRE-MAPPING CHECK - serialNumber value:", detectedInfo?.serialNumber);
    console.log("PRE-MAPPING CHECK - Full detected info:", detectedInfo);
    
    // IMPORTANT: Create a new object first, NOT using spread operator which might lose properties
    const combinedInfo = {};
    
    // First, copy specific fields from detected info
    if (detectedInfo) {
      combinedInfo.brand = detectedInfo.brand || '';
      combinedInfo.model = detectedInfo.model || '';
      combinedInfo.systemType = detectedInfo.systemType || '';
      
      // CRITICAL FIX: Explicitly assign the serial number
      combinedInfo.serialNumber = detectedInfo.serialNumber || '';
      
      combinedInfo.age = detectedInfo.age || detectedInfo.estimatedAge || '';
      combinedInfo.tonnage = detectedInfo.tonnage || detectedInfo.capacity || '';
      combinedInfo.efficiencyRating = detectedInfo.efficiencyRating || '';
      combinedInfo.lastServiced = detectedInfo.lastServiced || '';
    }
    
    // Then apply any manual entries that have values
    if (manualEntryData.serialNumber) {
      combinedInfo.serialNumber = manualEntryData.serialNumber;
    }
    
    if (manualEntryData.tonnage) {
      combinedInfo.tonnage = manualEntryData.tonnage;
    }
    
    if (manualEntryData.age) {
      combinedInfo.age = manualEntryData.age;
    }
    
    if (manualEntryData.lastServiced) {
      combinedInfo.lastServiced = manualEntryData.lastServiced;
    }
    
    // Log the FINAL data with specific focus on the serial number
    console.log("FINAL MAPPING CHECK - serialNumber:", combinedInfo.serialNumber);
    console.log("DATA TRANSFER: Submitting to form:", combinedInfo);
    
    // Pass to parent
    if (onSystemInfoDetected) {
      // Wrap in try/catch to catch any errors
      try {
        onSystemInfoDetected(combinedInfo);
      } catch (err) {
        console.error("Error in onSystemInfoDetected callback:", err);
        alert("Error transferring data: " + err.message);
      }
    }
  };

  return (
    <CameraContainer>
      <FormDescription>
        Take a clear photo of your system's data plate to automatically detect system information.
      </FormDescription>
      
      <div style={{ minHeight: '300px', position: 'relative' }}>
        {/* 
          Different approach based on platform
          - For iOS: "accept" only but no "capture" attribute
          - For others: Include both with "environment" for back camera
        */}
        {isIOS ? (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        ) : (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        )}
        
        {/* Camera interface or captured image */}
        {!capturedImage ? (
          <CameraPlaceholder onClick={takePicture}>
            <CameraIcon>📷</CameraIcon>
            <p>Tap to {isIOS ? "open camera" : "take a photo"}</p>
            <small>{isIOS ? "Please select the back camera" : "Uses back camera"}</small>
          </CameraPlaceholder>
        ) : (
          <ImagePreview src={capturedImage} alt="Captured HVAC system" />
        )}
      </div>
      
      {/* Camera tips */}
      {showTips && (
        <RotateTip>
          <TipIcon>💡</TipIcon>
          <div>
            <strong>Tip:</strong> For best results, make sure the data plate is well-lit and text is clearly visible. 
            Rotate your device if needed to get a better angle.
          </div>
        </RotateTip>
      )}
      
      {/* Error message */}
      {cameraError && (
        <StatusMessage error>
          {cameraError}
        </StatusMessage>
      )}
      
      {/* Camera controls */}
      <ButtonContainer>
        {!capturedImage ? (
          <Button 
            primary 
            onClick={takePicture}
          >
            {isIOS ? "Open Camera" : "Take Photo"}
          </Button>
        ) : (
          <>
            <Button onClick={retakePhoto}>Retake Photo</Button>
            <Button 
              primary 
              onClick={analyzeImage} 
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze System'}
            </Button>
          </>
        )}
      </ButtonContainer>
      
      {/* Analysis status */}
      {analysisStatus && (
        <StatusMessage 
          success={analysisStatus.type === 'success'} 
          error={analysisStatus.type === 'error'}
          warning={analysisStatus.type === 'warning'}
        >
          {analysisStatus.message}
        </StatusMessage>
      )}
      
      {/* Display detected info with improved table layout */}
      {detectedInfo && (
        <DetectedInfo>
          <h4>Detected System Information:</h4>
          <Table>
            <tbody>
              <tr>
                <th>Brand:</th>
                <td>{detectedInfo.brand || <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              <tr>
                <th>Model:</th>
                <td>{detectedInfo.model || <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              <tr>
                <th>System Type:</th>
                <td>{detectedInfo.systemType ? formatSystemType(detectedInfo.systemType) : <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              <tr>
                <th>Serial Number:</th>
                <td>{detectedInfo.serialNumber || <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              <tr>
                <th>System Age:</th>
                <td>{detectedInfo.age || detectedInfo.estimatedAge || <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              <tr>
                <th>System Size:</th>
                <td>{detectedInfo.tonnage || detectedInfo.capacity || <MissingInfo>Not detected</MissingInfo>}</td>
              </tr>
              {detectedInfo.efficiencyRating && (
                <tr>
                  <th>Efficiency Rating:</th>
                  <td>{detectedInfo.efficiencyRating}</td>
                </tr>
              )}
            </tbody>
          </Table>
          
          {!showManualEntry && (
            <ManualEntryButton onClick={() => setShowManualEntry(true)}>
              Add missing information manually
            </ManualEntryButton>
          )}
        </DetectedInfo>
      )}
      
      {/* Manual entry form for missing information */}
      {showManualEntry && (
        <ManualEntryForm>
          <h4>Add Missing Information</h4>
          <p>Please provide any information that couldn't be detected automatically.</p>
          
          <FormRow>
            {!detectedInfo?.serialNumber && (
              <FormGroup>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input 
                  type="text" 
                  id="serialNumber" 
                  name="serialNumber" 
                  value={manualEntryData.serialNumber} 
                  onChange={handleManualEntryChange} 
                  placeholder="Enter serial number"
                />
              </FormGroup>
            )}
            
            {(!detectedInfo?.tonnage && !detectedInfo?.capacity) && (
              <FormGroup>
                <Label htmlFor="tonnage">System Size (Tons)</Label>
                <Select 
                  id="tonnage" 
                  name="tonnage" 
                  value={manualEntryData.tonnage} 
                  onChange={handleManualEntryChange}
                >
                  <option value="">Select tonnage</option>
                  <option value="1.5">1.5 Tons</option>
                  <option value="2">2 Tons</option>
                  <option value="2.5">2.5 Tons</option>
                  <option value="3">3 Tons</option>
                  <option value="3.5">3.5 Tons</option>
                  <option value="4">4 Tons</option>
                  <option value="5">5 Tons</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </FormGroup>
            )}
          </FormRow>
          
          <FormRow>
            {(!detectedInfo?.age && !detectedInfo?.estimatedAge) && (
              <FormGroup>
                <Label htmlFor="age">System Age</Label>
                <Select 
                  id="age" 
                  name="age" 
                  value={manualEntryData.age} 
                  onChange={handleManualEntryChange}
                >
                  <option value="">Select age range</option>
                  <option value="0-5">0-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="11-15">11-15 years</option>
                  <option value="16-20">16-20 years</option>
                  <option value="20+">Over 20 years</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </FormGroup>
            )}
            
            <FormGroup>
              <Label htmlFor="lastServiced">Last Serviced</Label>
              <Select 
                id="lastServiced" 
                name="lastServiced" 
                value={manualEntryData.lastServiced} 
                onChange={handleManualEntryChange}
              >
                <option value="">Select timeframe</option>
                <option value="0-6">Within 6 months</option>
                <option value="6-12">6-12 months ago</option>
                <option value="1-2">1-2 years ago</option>
                <option value="2+">Over 2 years ago</option>
                <option value="never">Never</option>
                <option value="unknown">Unknown</option>
              </Select>
            </FormGroup>
          </FormRow>
          
          <Button primary onClick={submitCombinedData}>
            Use This Information
          </Button>
        </ManualEntryForm>
      )}
    </CameraContainer>
  );
};

// Helper function to format system type for display
function formatSystemType(type) {
  if (!type) return "";
  
  const displayNames = {
    "central-ac": "Central Air Conditioning",
    "heat-pump": "Heat Pump",
    "furnace": "Furnace",
    "boiler": "Boiler",
    "mini-split": "Mini-Split / Ductless",
    "package-unit": "Package Unit"
  };
  
  return displayNames[type] || type;
}

// System type selection component
const SystemTypeForm = ({ onSubmit }) => {
  const systemTypes = [
    { id: 'central-ac', name: 'Central Air Conditioning' },
    { id: 'heat-pump', name: 'Heat Pump' },
    { id: 'furnace', name: 'Furnace' },
    { id: 'boiler', name: 'Boiler' },
    { id: 'mini-split', name: 'Mini-Split / Ductless System' },
    { id: 'package-unit', name: 'Package Unit' }
  ];

  return (
    <FormContainer>
      <FormTitle>Select HVAC System Type</FormTitle>
      
      {systemTypes.map(type => (
        <SelectionCard 
          key={type.id} 
          onClick={() => onSubmit(type.id)}
        >
          <h3>{type.name}</h3>
          <p>Click to select this system type</p>
        </SelectionCard>
      ))}
    </FormContainer>
  );
};

// This is just the updated SystemInfoForm component that needs to be modified
// in your DiagnosticForm.js file

const SystemInfoForm = ({ systemType, onSubmit, onBack, initialFormData = null }) => {
  // Initialize form data from props if available, otherwise use empty object
  const [formData, setFormData] = useState(() => {
    // If initialFormData is provided, use it to initialize the form
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      console.log("Initializing form with saved data:", initialFormData);
      return { ...initialFormData };
    }
    
    // Otherwise use default empty values
    return {
      brand: '',
      model: '',
      serialNumber: '',
      age: '',
      lastServiced: '',
      location: '',
      efficiencyRating: '',
      additionalInfo: ''
    };
  });
  
  // For debugging - log whenever formData changes
  useEffect(() => {
    console.log("SystemInfoForm formData updated:", formData);
  }, [formData]);
  
  // For advanced fields toggle
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  
  // For camera functionality
  const [showCamera, setShowCamera] = useState(false);
  
  // Add this new state to track when camera is opened for a new scan
  const [isFreshScan, setIsFreshScan] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    onSubmit(formData);
  };
  
  // Modified function to toggle camera and track fresh scans
  const toggleCamera = () => {
    // If opening the camera, mark as a fresh scan
    if (!showCamera) {
      setIsFreshScan(true);
    }
    setShowCamera(!showCamera);
  };
  
  // Updated handleSystemInfoDetected to handle fresh scans correctly
  const handleSystemInfoDetected = (detectedInfo) => {
    console.log("FORM UPDATE START - Received data:", detectedInfo);
    console.log("CRITICAL CHECK - Received serialNumber:", detectedInfo.serialNumber);
    console.log("FRESH SCAN:", isFreshScan);
    
    // Create a new object explicitly without using spread operators
    let updatedFormData = {};
    
    // If it's a fresh scan, don't copy existing form data
    if (isFreshScan) {
      // Start with empty values
      updatedFormData = {
        brand: '',
        model: '',
        serialNumber: '',
        age: '',
        lastServiced: '',
        location: '',
        efficiencyRating: '',
        additionalInfo: ''
      };
      console.log("Fresh scan - starting with empty form data");
    } else {
      // For subsequent scans, preserve existing data
      Object.keys(formData).forEach(key => {
        updatedFormData[key] = formData[key];
      });
      console.log("Subsequent scan - preserving existing form data");
    }
    
    // Now add the detected info, using explicit assignments
    updatedFormData.brand = detectedInfo.brand || updatedFormData.brand || '';
    updatedFormData.model = detectedInfo.model || updatedFormData.model || '';
    updatedFormData.systemType = detectedInfo.systemType || updatedFormData.systemType || '';
    
    // CRITICAL FIX - Explicitly handle serial number with extra logging
    console.log("BEFORE SETTING - formData.serialNumber:", updatedFormData.serialNumber);
    console.log("BEFORE SETTING - detectedInfo.serialNumber:", detectedInfo.serialNumber);
    
    // Force the serial number value directly
    updatedFormData.serialNumber = detectedInfo.serialNumber || updatedFormData.serialNumber || '';
    
    // Handle other fields
    updatedFormData.age = detectedInfo.age || detectedInfo.estimatedAge || updatedFormData.age || '';
    updatedFormData.tonnage = detectedInfo.tonnage || detectedInfo.capacity || updatedFormData.tonnage || '';
    updatedFormData.efficiencyRating = detectedInfo.efficiencyRating || updatedFormData.efficiencyRating || '';
    updatedFormData.lastServiced = detectedInfo.lastServiced || updatedFormData.lastServiced || '';
    
    console.log("AFTER MAPPING - new formData.serialNumber:", updatedFormData.serialNumber);
    console.log("FORM UPDATE - Final mapped data:", updatedFormData);
    
    // Set form data with the new object
    setFormData(updatedFormData);
    
    // Reset the fresh scan flag
    setIsFreshScan(false);
    
    // Force immediate rerender by closing camera
    setShowCamera(false);
  };

  // Rest of the component remains the same as before
  // ...

  // Get fields based on system type
  const getSystemSpecificFields = () => {
    switch (systemType) {
      case 'central-ac':
        return (
          <FormGroup>
            <Label htmlFor="tonnage">System Size (Tons)</Label>
            <Select 
              id="tonnage" 
              name="tonnage" 
              value={formData.tonnage || ''} 
              onChange={handleChange}
            >
              <option value="">Select tonnage</option>
              <option value="1.5">1.5 Tons</option>
              <option value="2">2 Tons</option>
              <option value="2.5">2.5 Tons</option>
              <option value="3">3 Tons</option>
              <option value="3.5">3.5 Tons</option>
              <option value="4">4 Tons</option>
              <option value="5">5 Tons</option>
              <option value="unknown">Unknown</option>
            </Select>
          </FormGroup>
        );
        
      case 'furnace':
        return (
          <FormGroup>
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select 
              id="fuelType" 
              name="fuelType" 
              value={formData.fuelType || ''} 
              onChange={handleChange}
            >
              <option value="">Select fuel type</option>
              <option value="natural-gas">Natural Gas</option>
              <option value="propane">Propane</option>
              <option value="oil">Oil</option>
              <option value="electric">Electric</option>
            </Select>
          </FormGroup>
        );
        
      default:
        return null;
    }
  };

  return (
    <FormContainer>
      <FormTitle>System Information</FormTitle>
      
      {/* Quick Scan Option - Updated to use toggleCamera */}
      <QuickActionCard>
        <CardTitle>Quick System Scan</CardTitle>
        <CardDescription>
          Take a photo of your system's data plate to automatically populate system information.
        </CardDescription>
        <Button 
          type="button" 
          onClick={toggleCamera}
        >
          {showCamera ? 'Hide Camera' : 'Scan System with Camera'}
        </Button>
      </QuickActionCard>
      
      {showCamera && (
        <CameraCapture 
          onSystemInfoDetected={handleSystemInfoDetected}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="brand">Brand/Manufacturer</Label>
          <Input 
            type="text" 
            id="brand" 
            name="brand" 
            value={formData.brand} 
            onChange={handleChange} 
            placeholder="e.g., Carrier, Trane, Lennox"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="model">Model Number</Label>
          <Input 
            type="text" 
            id="model" 
            name="model" 
            value={formData.model} 
            onChange={handleChange} 
            placeholder="e.g., XR14"
          />
          <FieldHelper>Found on the data plate, usually a combination of letters and numbers</FieldHelper>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="serialNumber">Serial Number (Optional)</Label>
          <Input 
            type="text" 
            id="serialNumber" 
            name="serialNumber" 
            value={formData.serialNumber} 
            onChange={handleChange} 
            placeholder="e.g., 123456789"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="age">System Age</Label>
          <Select 
            id="age" 
            name="age" 
            value={formData.age} 
            onChange={handleChange}
          >
            <option value="">Select age range</option>
            <option value="0-5">0-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="11-15">11-15 years</option>
            <option value="16-20">16-20 years</option>
            <option value="20+">Over 20 years</option>
            <option value="unknown">Unknown</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="lastServiced">Last Serviced</Label>
          <Select 
            id="lastServiced" 
            name="lastServiced" 
            value={formData.lastServiced} 
            onChange={handleChange}
          >
            <option value="">Select timeframe</option>
            <option value="0-6">Within 6 months</option>
            <option value="6-12">6-12 months ago</option>
            <option value="1-2">1-2 years ago</option>
            <option value="2+">Over 2 years ago</option>
            <option value="never">Never</option>
            <option value="unknown">Unknown</option>
          </Select>
        </FormGroup>
        
        {getSystemSpecificFields()}
        
        {/* Location Information */}
        <FormGroup>
          <Label htmlFor="location">Location (for regional pricing)</Label>
          <Input 
            type="text" 
            id="location" 
            name="location" 
            value={formData.location} 
            onChange={handleChange}
            placeholder="e.g., Phoenix, AZ"
          />
        </FormGroup>
        
        {/* Toggle for Advanced Fields */}
        <ToggleContainer onClick={() => setShowAdvancedFields(!showAdvancedFields)}>
          <ToggleButton open={showAdvancedFields}>
            {showAdvancedFields ? 'Hide' : 'Show'} Advanced Fields
          </ToggleButton>
        </ToggleContainer>
        
        {/* Advanced Fields */}
        {showAdvancedFields && (
          <>
            <FormGroup>
              <Label htmlFor="efficiencyRating">Efficiency Rating (if known)</Label>
              <Input 
                type="text" 
                id="efficiencyRating" 
                name="efficiencyRating" 
                value={formData.efficiencyRating} 
                onChange={handleChange} 
                placeholder="e.g., SEER 16, AFUE 95%"
              />
              <FieldHelper>
                SEER for AC/Heat Pumps, AFUE for furnaces, found on the data plate or specifications
              </FieldHelper>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <TextArea 
                id="additionalInfo" 
                name="additionalInfo" 
                value={formData.additionalInfo} 
                onChange={handleChange} 
                placeholder="Any other details about your system or installation"
              />
            </FormGroup>
          </>
        )}
        
        <ButtonContainer>
          <Button type="button" onClick={onBack}>Back</Button>
          <Button type="submit" primary>Next</Button>
        </ButtonContainer>
      </form>
    </FormContainer>
  );
};
// Symptoms form
const SymptomsForm = ({ systemType, onSubmit, onBack }) => {
  const [symptomType, setSymptomType] = useState('');
  const [additionalSymptoms, setAdditionalSymptoms] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const fullSymptomDescription = symptomType 
      ? `${symptomType}. ${additionalSymptoms}` 
      : additionalSymptoms;
    
    onSubmit(fullSymptomDescription);
  };
  
  // Get common symptoms based on system type
  const getCommonSymptoms = () => {
    switch (systemType) {
      case 'central-ac':
        return [
          { id: 'not-cooling', text: 'System is not cooling' },
          { id: 'weak-airflow', text: 'Weak or reduced airflow' },
          { id: 'making-noise', text: 'System is making unusual noises' },
          { id: 'freezing-up', text: 'System is freezing up' },
          { id: 'leaking', text: 'System is leaking water' }
        ];
      
      case 'furnace':
        return [
          { id: 'no-heat', text: 'Furnace is not producing heat' },
          { id: 'insufficient-heat', text: 'Not enough heat' },
          { id: 'short-cycling', text: 'Furnace turns on and off frequently' },
          { id: 'blowing-cold', text: 'Blowing cold air' },
          { id: 'unusual-smell', text: 'Unusual smell when running' }
        ];
        
      case 'heat-pump':
        return [
          { id: 'not-heating', text: 'Not heating in winter' },
          { id: 'not-cooling', text: 'Not cooling in summer' },
          { id: 'ice-buildup', text: 'Ice building up on outdoor unit' },
          { id: 'running-constantly', text: 'Running constantly' },
          { id: 'making-noise', text: 'Making unusual noises' }
        ];
        
      default:
        return [
          { id: 'not-working', text: 'System not working' },
          { id: 'strange-noise', text: 'Making strange noises' },
          { id: 'poor-performance', text: 'Poor performance' },
          { id: 'leaking', text: 'System is leaking' }
        ];
    }
  };
  
  return (
    <FormContainer>
      <FormTitle>Describe the Problem</FormTitle>
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Select Common Symptom</Label>
          {getCommonSymptoms().map(symptom => (
            <div key={symptom.id} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="radio"
                  name="symptomType"
                  value={symptom.text}
                  checked={symptomType === symptom.text}
                  onChange={() => setSymptomType(symptom.text)}
                  style={{ marginRight: '10px' }}
                />
                {symptom.text}
              </label>
            </div>
          ))}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="additionalSymptoms">Additional Details</Label>
          <TextArea 
            id="additionalSymptoms" 
            value={additionalSymptoms} 
            onChange={(e) => setAdditionalSymptoms(e.target.value)} 
            placeholder="Describe the issue in more detail. When did it start? Are there any unusual sounds, smells, or behaviors?"
          />
        </FormGroup>
        
        <ButtonContainer>
          <Button type="button" onClick={onBack}>Back</Button>
          <Button type="submit" primary>Diagnose</Button>
        </ButtonContainer>
      </form>
    </FormContainer>
  );
};

// Main form component that conditionally renders the correct form based on the current step
const DiagnosticForm = ({ formType, systemType, onSubmit, onBack }) => {
  switch (formType) {
    case 'systemType':
      return <SystemTypeForm onSubmit={onSubmit} />;
      
    case 'systemInfo':
      return <SystemInfoForm systemType={systemType} onSubmit={onSubmit} onBack={onBack} />;
      
    case 'symptoms':
      return <SymptomsForm systemType={systemType} onSubmit={onSubmit} onBack={onBack} />;
      
    default:
      return <div>Unknown form type</div>;
  }
};

export default DiagnosticForm;
