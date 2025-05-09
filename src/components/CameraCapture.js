// src/components/CameraCapture.js
import React, { useState, useRef } from 'react';
import styled from 'styled-components';

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

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
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
`;

const CameraCapture = ({ onImageCaptured, onSystemInfoDetected }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      alert("Camera access denied or not available. Please ensure camera permissions are granted.");
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
      
      // Pass image data to parent component
      if (onImageCaptured) {
        onImageCaptured(imageDataUrl);
      }
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    
    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'hvac-system.jpg');
      
      // Send to backend for analysis
      const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';
      const analysisResponse = await fetch(`${API_URL}/api/analyze-image`, {
        method: 'POST',
        body: formData
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Server responded with ${analysisResponse.status}`);
      }
      
      const result = await analysisResponse.json();
      
      // Pass detected info to parent component
      if (onSystemInfoDetected && result.systemInfo) {
        onSystemInfoDetected(result.systemInfo);
      }
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Failed to analyze the image. Please try again or enter system details manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Start camera when component mounts
  React.useEffect(() => {
    startCamera();
    
    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  const StatusMessage = styled.div`
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => props.success ? '#d4edda' : '#f8d7da'};
  color: ${props => props.success ? '#155724' : '#721c24'};
`;

// Add this to the component
{isAnalyzing && (
  <StatusMessage>
    <LoadingSpinner size="small" />
    Analyzing image... This may take a few seconds
  </StatusMessage>
)}

// Add this to CameraCapture.js after analysis is complete
{detectedInfo && (
  <div>
    <h4>Detected System Information:</h4>
    <ul>
      {Object.entries(detectedInfo).map(([key, value]) => (
        value && <li key={key}><strong>{key}:</strong> {value}</li>
      ))}
    </ul>
  </div>
)}

  return (
    <CameraContainer>
      <h3>Take a Photo of the HVAC System</h3>
      <p>Position camera to clearly capture the model/serial number plate</p>
      
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
            <Button onClick={retakePhoto}>Retake</Button>
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
    </CameraContainer>
  );
};

export default CameraCapture;
