// src/components/PropertyDetails.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import rentcastService from '../services/rentcastService';

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

const PropertyCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const PropertyDetails = ({ address, onPropertyDetailsSubmit, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propertyData, setPropertyData] = useState({
    propertyType: 'residential',
    yearBuilt: '',
    squareFeet: '',
    bedrooms: '',
    bathrooms: '',
    lotSize: '',
    features: {
      hasPool: false,
      hasGarage: false,
      hasCentralAir: true, // Default to true since this is an HVAC app
      hasBasement: false
    },
    ownerInfo: {
      name: '',
      phone: '',
      email: ''
    },
    tenantInfo: {
      name: '',
      phone: '',
      email: ''
    }
  });
  
  // Fetch property details from Rentcast when component mounts
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      // Make sure we have at least some address data before attempting to fetch
      if (!address || (!address.latitude && !address.longitude && !address.streetNumber)) {
        console.log('Insufficient address data to query Rentcast', address);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching property details for address:', address);
        
        // First, try to use our new getPropertyWithFallback method that tries multiple approaches
        let propertyDetails;
        try {
          // Use fallback method to try different lookup methods
          propertyDetails = await rentcastService.getPropertyWithFallback(address);
        } catch (fallbackError) {
          console.error('All RentCast lookup methods failed:', fallbackError);
          
          // If fallback method fails, let's try each method individually with more specific error handling
          
          // Try address-based lookup if we have enough address components
          if (address.streetNumber && address.street && address.city && address.state) {
            try {
              console.log('Attempting direct address lookup...');
              propertyDetails = await rentcastService.getPropertyByAddress(address);
            } catch (addressError) {
              console.error('Direct address lookup failed:', addressError);
              // Continue to coordinates lookup
            }
          }
          
          // Try coordinates lookup if we have lat/long and haven't succeeded yet
          if (!propertyDetails && address.latitude && address.longitude) {
            try {
              console.log('Attempting direct coordinates lookup...');
              propertyDetails = await rentcastService.getPropertyByLocation(
                address.latitude,
                address.longitude
              );
            } catch (coordsError) {
              console.error('Direct coordinates lookup failed:', coordsError);
              throw new Error('All RentCast lookup methods failed');
            }
          }
          
          // If we've reached here and still don't have propertyDetails, we need to throw an error
          if (!propertyDetails) {
            throw new Error('Could not retrieve property details from RentCast');
          }
        }
        
        console.log('Property details retrieved:', propertyDetails);
        
        // Update state with fetched data
        setPropertyData({
          propertyType: propertyDetails.propertyAttributes.propertyType || 'residential',
          yearBuilt: propertyDetails.propertyAttributes.yearBuilt || '',
          squareFeet: propertyDetails.propertyAttributes.squareFeet || '',
          bedrooms: propertyDetails.propertyAttributes.bedrooms || '',
          bathrooms: propertyDetails.propertyAttributes.bathrooms || '',
          lotSize: propertyDetails.propertyAttributes.lotSize || '',
          features: {
            hasPool: propertyDetails.propertyFeatures.hasPool || false,
            hasGarage: propertyDetails.propertyFeatures.hasGarage || false,
            hasCentralAir: propertyDetails.propertyFeatures.hasCentralAir || true,
            hasBasement: propertyDetails.propertyFeatures.hasBasement || false
          },
          ownerInfo: {
            name: propertyDetails.ownerInfo.name || '',
            phone: propertyDetails.ownerInfo.phoneNumber || '',
            email: propertyDetails.ownerInfo.email || ''
          },
          tenantInfo: {
            name: propertyDetails.tenantInfo.tenantName || '',
            phone: propertyDetails.tenantInfo.tenantPhone || '',
            email: propertyDetails.tenantInfo.tenantEmail || ''
          }
        });
        
        // Show success message
        setError({
          type: 'success',
          message: 'Property details retrieved successfully!'
        });
      } catch (err) {
        console.error('Error fetching property details:', err);
        setError({
          type: 'warning',
          message: `Unable to fetch property details: ${err.message}. Please enter information manually.`
        });
        // Keep using default values
      } finally {
        setLoading(false);
      }
    };
    
    fetchPropertyDetails();
  }, [address]);
  
  const handleChange = (e, section, subField) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkboxes vs. text inputs
    const fieldValue = type === 'checkbox' ? checked : value;
    
    // Update nested fields if necessary
    if (section && subField) {
      setPropertyData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subField]: fieldValue
        }
      }));
    } else if (section) {
      setPropertyData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: fieldValue
        }
      }));
    } else {
      setPropertyData(prev => ({
        ...prev,
        [name]: fieldValue
      }));
    }
  };
  
  const handleSubmit = () => {
    // Combine address with property details
    const completePropertyData = {
      address: {
        streetAddress: `${address.streetNumber} ${address.street}`,
        unit: address.unit || '',
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        latitude: address.latitude,
        longitude: address.longitude,
        formattedAddress: address.formattedAddress
      },
      propertyType: propertyData.propertyType,
      attributes: {
        yearBuilt: propertyData.yearBuilt,
        squareFeet: propertyData.squareFeet,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        lotSize: propertyData.lotSize
      },
      features: propertyData.features,
      ownerInfo: propertyData.ownerInfo,
      tenantInfo: propertyData.tenantInfo
    };
    
    // Pass the property data up to the parent component
    onPropertyDetailsSubmit(completePropertyData);
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <p>Fetching property details...</p>
      </LoadingContainer>
    );
  }
  
  return (
    <Container>
      <Title>Property Details</Title>
      
      <InfoText>
        These details help us provide more accurate diagnostics and service recommendations
        for your HVAC system.
      </InfoText>
      
      {error && (
        <StatusMessage type={error.type || "warning"}>
          {error.message}
        </StatusMessage>
      )}
      
      <PropertyCard>
        <CardTitle>Property Information</CardTitle>
        
        <FormGroup>
          <Label htmlFor="propertyType">Property Type</Label>
          <Select
            id="propertyType"
            name="propertyType"
            value={propertyData.propertyType}
            onChange={handleChange}
          >
            <option value="residential">Residential</option>
            <option value="multi-family">Multi-Family</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </Select>
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="yearBuilt">Year Built</Label>
            <Input
              type="text"
              id="yearBuilt"
              name="yearBuilt"
              value={propertyData.yearBuilt}
              onChange={handleChange}
              placeholder="e.g. 1985"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="squareFeet">Square Feet</Label>
            <Input
              type="text"
              id="squareFeet"
              name="squareFeet"
              value={propertyData.squareFeet}
              onChange={handleChange}
              placeholder="e.g. 2000"
            />
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input
              type="text"
              id="bedrooms"
              name="bedrooms"
              value={propertyData.bedrooms}
              onChange={handleChange}
              placeholder="e.g. 3"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input
              type="text"
              id="bathrooms"
              name="bathrooms"
              value={propertyData.bathrooms}
              onChange={handleChange}
              placeholder="e.g. 2"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="lotSize">Lot Size (sq ft)</Label>
            <Input
              type="text"
              id="lotSize"
              name="lotSize"
              value={propertyData.lotSize}
              onChange={handleChange}
              placeholder="e.g. 10000"
            />
          </FormGroup>
        </FormRow>
        
        <FormGroup>
          <Label>Property Features</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                name="hasPool"
                checked={propertyData.features.hasPool}
                onChange={(e) => handleChange(e, 'features')}
                style={{ marginRight: '8px' }}
              />
              Swimming Pool
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                name="hasGarage"
                checked={propertyData.features.hasGarage}
                onChange={(e) => handleChange(e, 'features')}
                style={{ marginRight: '8px' }}
              />
              Garage
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                name="hasCentralAir"
                checked={propertyData.features.hasCentralAir}
                onChange={(e) => handleChange(e, 'features')}
                style={{ marginRight: '8px' }}
              />
              Central Air
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                name="hasBasement"
                checked={propertyData.features.hasBasement}
                onChange={(e) => handleChange(e, 'features')}
                style={{ marginRight: '8px' }}
              />
              Basement
            </label>
          </div>
        </FormGroup>
      </PropertyCard>
      
      <PropertyCard>
        <CardTitle>Owner Information</CardTitle>
        
        <FormGroup>
          <Label htmlFor="ownerName">Owner Name</Label>
          <Input
            type="text"
            id="ownerName"
            name="name"
            value={propertyData.ownerInfo.name}
            onChange={(e) => handleChange(e, 'ownerInfo')}
            placeholder="e.g. John Smith"
          />
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="ownerPhone">Owner Phone</Label>
            <Input
              type="tel"
              id="ownerPhone"
              name="phone"
              value={propertyData.ownerInfo.phone}
              onChange={(e) => handleChange(e, 'ownerInfo')}
              placeholder="e.g. 555-123-4567"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="ownerEmail">Owner Email</Label>
            <Input
              type="email"
              id="ownerEmail"
              name="email"
              value={propertyData.ownerInfo.email}
              onChange={(e) => handleChange(e, 'ownerInfo')}
              placeholder="e.g. john@example.com"
            />
          </FormGroup>
        </FormRow>
      </PropertyCard>
      
      <PropertyCard>
        <CardTitle>Tenant Information</CardTitle>
        
        <FormGroup>
          <Label htmlFor="tenantName">Tenant Name</Label>
          <Input
            type="text"
            id="tenantName"
            name="name"
            value={propertyData.tenantInfo.name}
            onChange={(e) => handleChange(e, 'tenantInfo')}
            placeholder="e.g. Jane Doe"
          />
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="tenantPhone">Tenant Phone</Label>
            <Input
              type="tel"
              id="tenantPhone"
              name="phone"
              value={propertyData.tenantInfo.phone}
              onChange={(e) => handleChange(e, 'tenantInfo')}
              placeholder="e.g. 555-123-4567"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="tenantEmail">Tenant Email</Label>
            <Input
              type="email"
              id="tenantEmail"
              name="email"
              value={propertyData.tenantInfo.email}
              onChange={(e) => handleChange(e, 'tenantInfo')}
              placeholder="e.g. jane@example.com"
            />
          </FormGroup>
        </FormRow>
      </PropertyCard>
      
      <ButtonContainer>
        <Button onClick={onBack}>
          Back
        </Button>
        
        <Button 
          primary 
          onClick={handleSubmit}
        >
          Continue
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default PropertyDetails;
