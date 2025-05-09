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

// Camera capture component - FIXED version
const CameraCapture = ({ onImageCaptured, onSystemInfoDetected }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

  // IMPROVED: Start camera with better error handling and debugging
  const startCamera = async () => {
    console.log("Attempting to access camera...");
    setCameraLoading(true);
    setCameraError(null);
    
    // CRITICAL FIX: Make sure videoRef is properly initialized before using it
    if (!videoRef.current) {
      console.error("Video element reference is not yet available!");
      setCameraError("Camera initialization error. Please try again.");
      setCameraLoading(false);
      return;
    }
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      
      console.log("Requesting camera permissions...");
      const constraints = { 
        video: true // Simplify constraints to basic video for more compatibility
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera access granted!", mediaStream);
      
      if (mediaStream.getVideoTracks().length === 0) {
        throw new Error("No video tracks found in media stream");
      }
      
      console.log("Video tracks:", mediaStream.getVideoTracks());
      setStream(mediaStream);
      
      // CRITICAL FIX: Double check videoRef.current again
      if (videoRef.current) {
        console.log("Setting video source...");
        videoRef.current.srcObject = mediaStream;
        
        // Add a timeout to make sure the video element is ready
        setTimeout(() => {
          if (videoRef.current) {
            try {
              videoRef.current.play()
                .then(() => console.log("Video playback started successfully"))
                .catch(err => {
                  console.error("Error playing video:", err);
                  setCameraError(`Error playing video: ${err.message}`);
                });
            } catch (e) {
              console.error("Error playing video:", e);
              setCameraError(`Error playing video: ${e.message}`);
            }
          }
        }, 100);
      } else {
        console.error("Video element reference is null even after initial check");
        throw new Error("Video element not available");
      }
      
      setCameraLoading(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(`Camera error: ${err.message}. Please check camera permissions and try again.`);
      setCameraLoading(false);
    }
  };

  // The rest of the component remains the same...

  // CRITICAL: Add useEffect with explicit DOM check and retry mechanism
  useEffect(() => {
    console.log("CameraCapture component mounted");
    
    // Retry mechanism for camera initialization
    let retryCount = 0;
    const maxRetries = 3;
    
    const initCamera = () => {
      if (videoRef.current) {
        console.log("Video element is ready, starting camera");
        startCamera();
      } else {
        console.log(`Video element not ready, retry ${retryCount + 1}/${maxRetries}`);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initCamera, 500); // Wait 500ms before retry
        } else {
          console.error("Failed to initialize camera after retries");
          setCameraError("Could not initialize camera. Please refresh and try again.");
          setCameraLoading(false);
        }
      }
    };
    
    // Start initialization with a small delay to ensure DOM is ready
    setTimeout(initCamera, 100);
    
    // Clean up when component unmounts
    return () => {
      console.log("CameraCapture component unmounting");
      stopCamera();
    };
  }, []);

  return (
    <CameraContainer>
      <FormDescription>
        Position camera to clearly capture the model/serial number plate on your HVAC system
      </FormDescription>
      
      {/* Camera View - FIXED: Ensure video element is always rendered */}
      <div style={{ minHeight: '300px' }}>
        {!capturedImage && (
          cameraLoading ? (
            <CameraPlaceholder>
              <CameraIcon>📷</CameraIcon>
              <p>Camera loading...</p>
            </CameraPlaceholder>
          ) : (
            // CRITICAL FIX: Always render the video element
            <VideoPreview 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              onCanPlay={handleCanPlay}
              onError={handleVideoError}
              style={{ display: stream ? 'block' : 'none' }}
            />
          )
        )}
        
        {/* Display camera error placeholder if there's an error */}
        {!capturedImage && cameraError && !cameraLoading && (
          <CameraPlaceholder>
            <CameraIcon>🚫</CameraIcon>
            <p>Camera not available</p>
          </CameraPlaceholder>
        )}
        
        {/* Display captured image */}
        {capturedImage && (
          <ImagePreview src={capturedImage} alt="Captured HVAC system" />
        )}
      </div>
      
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Camera error message */}
      {cameraError && (
        <StatusMessage error>
          {cameraError}
        </StatusMessage>
      )}
      
      {/* Camera control buttons */}
      <ButtonContainer>
        {!capturedImage && (
          <Button 
            primary 
            onClick={captureImage}
            disabled={!stream || cameraLoading}
          >
            {cameraLoading ? 'Camera Loading...' : 'Take Photo'}
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
