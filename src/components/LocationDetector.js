// src/components/LocationDetector.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getCurrentPosition, reverseGeocode } from '../services/geolocation';

const Container = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 15px;
`;

const InfoText = styled.p`
  margin-bottom: 15px;
  color: #7f8c8d;
`;

const MapPreview = styled.div`
  width: 100%;
  height: 200px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: ${props => props.mapUrl ? `url(${props.mapUrl})` : 'none'};
  background-size: cover;
  background-position: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
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

const StatusMessage = styled.div`
  padding: 10px 15px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: ${props => {
    if (props.type === 'success') return '#d4edda';
    if (props.type === 'error') return '#f8d7da';
    if (props.type === 'warning') return '#fff3cd';
    return '#cce5ff';
  }};
  color: ${props => {
    if (props.type === 'success') return '#155724';
    if (props.type === 'error') return '#721c24';
    if (props.type === 'warning') return '#856404';
    return '#004085';
  }};
`;

const LocationInfo = styled.div`
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 15px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LocationDetector = ({ onLocationDetected, onSkip }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapUrl, setMapUrl] = useState(null);
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const detectLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current position from browser
      const position = await getCurrentPosition();
      setLocation(position);
      
      // Generate a static map URL
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${position.latitude},${position.longitude}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${position.latitude},${position.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      setMapUrl(staticMapUrl);
      
      // Reverse geocode to get address
      const addressInfo = await reverseGeocode(position.latitude, position.longitude);
      setAddress(addressInfo);
    } catch (err) {
      console.error('Error detecting location:', err);
      setError(`Unable to detect location: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (address) {
      onLocationDetected(address);
    } else {
      setError('No address detected. Please try again or enter address manually.');
    }
  };

  return (
    <Container>
      <Title>Detect Your Location</Title>
      
      <InfoText>
        We need to determine the property location for accurate diagnostic recommendations.
        Your location will be used to fetch property details and create service records.
      </InfoText>
      
      <ButtonContainer>
        <Button
          primary
          onClick={detectLocation}
          disabled={loading}
        >
          {loading && <LoadingSpinner />}
          {loading ? 'Detecting...' : 'Detect My Location'}
        </Button>
        
        <Button
          onClick={onSkip}
        >
          Enter Address Manually
        </Button>
      </ButtonContainer>
      
      {error && (
        <StatusMessage type="error">
          {error}
        </StatusMessage>
      )}
      
      {mapUrl && (
        <MapPreview mapUrl={mapUrl} />
      )}
      
      {address && (
        <>
          <LocationInfo>
            <h3>Detected Address:</h3>
            <p>{address.formattedAddress}</p>
            <p>
              <strong>Coordinates:</strong> {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
            </p>
          </LocationInfo>
          
          <Button primary onClick={handleContinue}>
            Use This Location
          </Button>
        </>
      )}
    </Container>
  );
};

export default LocationDetector;
