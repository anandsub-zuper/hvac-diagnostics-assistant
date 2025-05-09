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
  background-color: ${props => props.success ? '#d4edda' : props.error ? '#f8d7da' : '#cce5ff'};
  color: ${props => props.success ? '#155724' : props.error ? '#721c24' : '#004085'};
`;

const DetectedInfo = styled.div`
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  border-radius: 4px;
`;

// Camera capture component
const CameraCapture = ({ onImageCaptured, onSystemInfoDetected }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Use back camera if available
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setAnalysisStatus({
        type: 'error',
        message: "Camera access denied or not available. Please ensure camera permissions are granted."
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      
      // Stop camera after capturing
      stopCamera();
      
      // Pass image data to parent component if needed
      if (onImageCaptured) {
        onImageCaptured(imageDataUrl);
      }
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    setAnalysisStatus({
      type: 'info',
      message: "Analyzing image... This may take a few seconds"
    });
    
    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'hvac-system.jpg');
      
      // Send to backend for analysis
      const analysisResponse = await axios.post(`${API_URL}/api/analyze-image`, {
        image: capturedImage.split(',')[1] // Send base64 data without the prefix
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 25000 // 25 second timeout
      });
      
      if (analysisResponse.data && analysisResponse.data.systemInfo) {
        setDetectedInfo(analysisResponse.data.systemInfo);
        
        setAnalysisStatus({
          type: 'success',
          message: "System information successfully detected!"
        });
        
        // Pass detected info to parent component
        if (onSystemInfoDetected) {
          onSystemInfoDetected(analysisResponse.data.systemInfo);
        }
      } else {
        throw new Error("Invalid response from image analysis");
      }
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      setAnalysisStatus({
        type: 'error',
        message: "Failed to analyze the image. Please try again or enter system details manually."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectedInfo(null);
    setAnalysisStatus(null);
    startCamera();
  };

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    
    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <CameraContainer>
      <FormDescription>
        Position camera to clearly capture the model/serial number plate on your HVAC system
      </FormDescription>
      
      {!capturedImage && stream && (
        <VideoPreview ref={videoRef} autoPlay muted playsInline />
      )}
      
      {capturedImage && (
        <ImagePreview src={capturedImage} alt="Captured HVAC system" />
      )}
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <ButtonContainer>
        {!capturedImage && stream && (
          <Button primary onClick={captureImage}>Take Photo</Button>
        )}
        
        {capturedImage && (
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
      
      {analysisStatus && (
        <StatusMessage success={analysisStatus.type === 'success'} error={analysisStatus.type === 'error'}>
          {analysisStatus.message}
        </StatusMessage>
      )}
      
      {detectedInfo && (
        <DetectedInfo>
          <h4>Detected System Information:</h4>
          <ul>
            {Object.entries(detectedInfo).map(([key, value]) => (
              value && <li key={key}><strong>{key}:</strong> {value}</li>
            ))}
          </ul>
        </DetectedInfo>
      )}
    </CameraContainer>
  );
};

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

// System information form
const SystemInfoForm = ({ systemType, onSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    serialNumber: '',
    age: '',
    lastServiced: '',
    location: '',
    efficiencyRating: '',
    additionalInfo: ''
  });
  
  // For advanced fields toggle
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  
  // For camera functionality
  const [showCamera, setShowCamera] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  const handleSystemInfoDetected = (detectedInfo) => {
    console.log("System info detected from image:", detectedInfo);
    setFormData({
      ...formData,
      ...detectedInfo
    });
    setShowCamera(false);
  };

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
      
      {/* Quick Scan Option */}
      <QuickActionCard>
        <CardTitle>Quick System Scan</CardTitle>
        <CardDescription>
          Take a photo of your system's data plate to automatically populate system information.
        </CardDescription>
        <Button 
          type="button" 
          onClick={() => setShowCamera(!showCamera)}
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
