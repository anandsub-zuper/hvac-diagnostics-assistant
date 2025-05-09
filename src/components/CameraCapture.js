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

// Completely redesigned CameraCapture component
const CameraCapture = ({ onImageCaptured, onSystemInfoDetected }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  // References
  const videoElementRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

  // Initialize camera after component is fully mounted
  useEffect(() => {
    let isMounted = true;
    
    const initializeCamera = async () => {
      // Wait for a moment to ensure the DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If component has unmounted during the timeout, abort
      if (!isMounted) return;
      
      try {
        // Verify browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser doesn't support camera access");
        }
        
        // Get the video element directly from the DOM
        const videoElement = document.getElementById('camera-video-element');
        if (!videoElement) {
          throw new Error("Camera initialization failed - video element not found");
        }
        
        // Store in ref
        videoElementRef.current = videoElement;
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStreamRef.current = stream;
        
        // Attach stream to video element
        videoElement.srcObject = stream;
        
        // Listen for when video is ready to play
        videoElement.onloadedmetadata = () => {
          if (!isMounted) return;
          
          videoElement.play()
            .then(() => {
              console.log("Camera started successfully");
              setCameraReady(true);
            })
            .catch(err => {
              console.error("Failed to play video:", err);
              setCameraError("Failed to start camera playback");
            });
        };
      } catch (err) {
        console.error("Camera initialization error:", err);
        if (isMounted) {
          setCameraError(`Camera error: ${err.message}`);
        }
      }
    };
    
    // Start initialization
    initializeCamera();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Stop media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear video source
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
      }
    };
  }, []);
  
  // Take photo function
  const captureImage = () => {
    if (!videoElementRef.current || !canvasRef.current) {
      setCameraError("Cannot capture image - camera not ready");
      return;
    }
    
    try {
      const videoElement = videoElementRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
      
      // Stop camera
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Pass image to parent if needed
      if (onImageCaptured) {
        onImageCaptured(imageDataUrl);
      }
    } catch (err) {
      console.error("Error capturing image:", err);
      setCameraError(`Failed to capture image: ${err.message}`);
    }
  };
  
  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setAnalysisStatus(null);
    setDetectedInfo(null);
    
    // Reinitialize camera
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    
    setCameraReady(false);
    
    // Restart camera after a brief delay
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStreamRef.current = stream;
        
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          videoElementRef.current.play()
            .then(() => {
              setCameraReady(true);
            })
            .catch(err => {
              console.error("Failed to restart video:", err);
              setCameraError("Failed to restart camera");
            });
        }
      } catch (err) {
        console.error("Error restarting camera:", err);
        setCameraError(`Failed to restart camera: ${err.message}`);
      }
    }, 500);
  };
  
  // Analyze image
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
        setDetectedInfo(response.data.systemInfo);
        setAnalysisStatus({
          type: 'success',
          message: "System information successfully detected!"
        });
        
        // Pass to parent
        if (onSystemInfoDetected) {
          onSystemInfoDetected(response.data.systemInfo);
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <CameraContainer>
      <FormDescription>
        Position camera to clearly capture the model/serial number plate on your HVAC system
      </FormDescription>
      
      <div style={{ minHeight: '300px', position: 'relative' }}>
        {/* IMPORTANT: We use a direct ID here instead of just a ref */}
        {!capturedImage && (
          <>
            {/* Camera loading or error state */}
            {(!cameraReady || cameraError) && (
              <CameraPlaceholder>
                <CameraIcon>{cameraError ? '🚫' : '📷'}</CameraIcon>
                <p>{cameraError ? 'Camera not available' : 'Camera loading...'}</p>
              </CameraPlaceholder>
            )}
            
            {/* The video element - ALWAYS rendered with a specific ID */}
            <VideoPreview 
              id="camera-video-element"
              autoPlay 
              playsInline 
              muted
              style={{ 
                display: cameraReady && !cameraError ? 'block' : 'none'
              }}
            />
          </>
        )}
        
        {/* Captured image */}
        {capturedImage && (
          <ImagePreview src={capturedImage} alt="Captured HVAC system" />
        )}
      </div>
      
      {/* Canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Error message */}
      {cameraError && (
        <StatusMessage error>
          {cameraError}
        </StatusMessage>
      )}
      
      {/* Camera controls */}
      <ButtonContainer>
        {!capturedImage && (
          <Button 
            primary 
            onClick={captureImage}
            disabled={!cameraReady || !!cameraError}
          >
            {!cameraReady ? 'Camera Loading...' : 'Take Photo'}
          </Button>
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
      
      {/* Analysis status */}
      {analysisStatus && (
        <StatusMessage success={analysisStatus.type === 'success'} error={analysisStatus.type === 'error'}>
          {analysisStatus.message}
        </StatusMessage>
      )}
      
      {/* Display detected info */}
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

export default CameraCapture;
