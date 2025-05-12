// src/components/AddressConfirmation.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { geocodeAddress } from '../services/geolocation';

const Container = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 15px;
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
  margin-bottom: 8px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 15px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
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
  margin-top: 10px;
`;

const AddressConfirmation = ({ initialAddress, onAddressConfirmed, onBack }) => {
  const [address, setAddress] = useState({
    streetNumber: initialAddress?.streetNumber || '',
    street: initialAddress?.street || '',
    unit: initialAddress?.unit || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    zipCode: initialAddress?.zipCode || '',
    country: initialAddress?.country || 'USA',
    latitude: initialAddress?.latitude || null,
    longitude: initialAddress?.longitude || null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapUrl, setMapUrl] = useState(null);
  const [isGeocoded, setIsGeocoded] = useState(false);
  
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  // Set initial map if we have coordinates
  React.useEffect(() => {
    if (initialAddress?.latitude && initialAddress?.longitude) {
      updateMapPreview(initialAddress.latitude, initialAddress.longitude);
      setIsGeocoded(true);
    }
  }, [initialAddress]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset geocoded status whenever address changes
    setIsGeocoded(false);
  };
  
  const updateMapPreview = (lat, lng) => {
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    setMapUrl(staticMapUrl);
  };
  
  const geocodeAndVerify = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format address for geocoding
      const addressString = `${address.streetNumber} ${address.street}, ${address.unit ? address.unit + ', ' : ''}${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
      
      // Geocode the address
      const geocodeResult = await geocodeAddress(addressString);
      
      // Update the address with geocoded data
      setAddress(prev => ({
        ...prev,
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        formattedAddress: geocodeResult.formattedAddress
      }));
      
      // Update map preview
      updateMapPreview(geocodeResult.latitude, geocodeResult.longitude);
      
      // Set geocoded flag
      setIsGeocoded(true);
    } catch (err) {
      console.error('Error geocoding address:', err);
      setError(`Unable to verify address: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirm = () => {
    // Require geocoding before confirmation
    if (!isGeocoded) {
      setError('Please verify the address first');
      return;
    }
    
    // Prepare the final address object
    const confirmedAddress = {
      streetNumber: address.streetNumber,
      street: address.street,
      unit: address.unit,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      formattedAddress: address.formattedAddress
    };
    
    // Call the callback with the confirmed address
    onAddressConfirmed(confirmedAddress);
  };
  
  return (
    <Container>
      <Title>Confirm Property Address</Title>
      
      <FormGroup>
        <Label htmlFor="streetNumber">Street Number</Label>
        <Input
          type="text"
          id="streetNumber"
          name="streetNumber"
          value={address.streetNumber}
          onChange={handleChange}
          placeholder="123"
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="street">Street Name</Label>
        <Input
          type="text"
          id="street"
          name="street"
          value={address.street}
          onChange={handleChange}
          placeholder="Main St"
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="unit">Unit/Apt (Optional)</Label>
        <Input
          type="text"
          id="unit"
          name="unit"
          value={address.unit}
          onChange={handleChange}
          placeholder="Apt 4B"
        />
      </FormGroup>
      
      <FormRow>
        <FormGroup>
          <Label htmlFor="city">City</Label>
          <Input
            type="text"
            id="city"
            name="city"
            value={address.city}
            onChange={handleChange}
            placeholder="Anytown"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="state">State</Label>
          <Input
            type="text"
            id="state"
            name="state"
            value={address.state}
            onChange={handleChange}
            placeholder="CA"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            type="text"
            id="zipCode"
            name="zipCode"
            value={address.zipCode}
            onChange={handleChange}
            placeholder="12345"
          />
        </FormGroup>
      </FormRow>
      
      {error && (
        <StatusMessage type="error">
          {error}
        </StatusMessage>
      )}
      
      {isGeocoded && (
        <StatusMessage type="success">
          Address verified successfully!
        </StatusMessage>
      )}
      
      {mapUrl && (
        <MapPreview mapUrl={mapUrl} />
      )}
      
      <ButtonContainer>
        <Button onClick={onBack}>
          Back
        </Button>
        
        <Button 
          onClick={geocodeAndVerify}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Address'}
        </Button>
        
        <Button 
          primary 
          onClick={handleConfirm}
          disabled={!isGeocoded}
        >
          Confirm Address
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default AddressConfirmation;
