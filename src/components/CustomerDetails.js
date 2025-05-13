// src/components/CustomerDetails.js - Fixed version

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import zuperService from '../services/zuperService';

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

const CustomerCard = styled.div`
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

const CustomerDetails = ({ propertyData, onCustomerDetailsSubmit, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    notes: '',
    customerType: 'residential'
  });
  
  // Extract contact information from property data if available
  useEffect(() => {
    if (propertyData && propertyData.ownerInfo) {
      const contactInfo = propertyData.ownerInfo;
      
      if (contactInfo.name) {
        // Split the name into first and last name
        const nameParts = contactInfo.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setCustomerData(prev => ({
          ...prev,
          firstName,
          lastName,
          email: contactInfo.email || '',
          phone: contactInfo.phone || ''
        }));
        
        // If we have an email or phone, try to search for existing customer
        if (contactInfo.email || contactInfo.phone) {
          searchForExistingCustomer(contactInfo.email, contactInfo.phone);
        }
      }
    }
  }, [propertyData]);
  
  // Improved search for existing customer
  const searchForExistingCustomer = async (email, phone) => {
    if (!email && !phone) return;
    
    setSearching(true);
    setError(null);
    
    try {
      console.log('Searching for existing customer with:', { email, phone });
      
      // Set a timeout for UI feedback
      const searchTimeout = setTimeout(() => {
        if (searching) {
          console.log('Customer search is taking longer than expected...');
        }
      }, 3000);
      
      const existingCustomer = await zuperService.searchCustomer(email, phone);
      
      clearTimeout(searchTimeout);
      
      if (existingCustomer) {
        // Found existing customer - update state with their info
        console.log('Found existing customer:', existingCustomer);
        
        // Extract the customer data - properly handling different field formats
        setCustomerData({
          firstName: existingCustomer.customer_first_name || existingCustomer.first_name || '',
          lastName: existingCustomer.customer_last_name || existingCustomer.last_name || '',
          email: existingCustomer.customer_email || existingCustomer.email || email || '',
          phone: existingCustomer.customer_phone || existingCustomer.phone || phone || '',
          companyName: existingCustomer.customer_company_name || existingCustomer.company_name || '',
          notes: existingCustomer.customer_notes || existingCustomer.notes || '',
          customerType: existingCustomer.customer_type || existingCustomer.type || 'residential',
          existingCustomerId: existingCustomer.id || existingCustomer.customer_id
        });
        
        // Show success message
        setError({
          type: 'success',
          message: 'Found existing customer in our records. Information has been pre-filled.'
        });
      } else {
        // No existing customer found - we'll create a new one later
        console.log('No existing customer found with email:', email, 'or phone:', phone);
      }
    } catch (err) {
      console.error('Error searching for customer:', err);
      
      // Show a non-blocking warning
      setError({
        type: 'warning',
        message: 'There was an issue checking for existing customers. You can continue with form submission.'
      });
    } finally {
      setSearching(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    // Basic validation
    if (!customerData.firstName || !customerData.lastName) {
      setError({
        type: 'error',
        message: 'First name and last name are required'
      });
      return false;
    }
    
    if (!customerData.email && !customerData.phone) {
      setError({
        type: 'error',
        message: 'At least one contact method (email or phone) is required'
      });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Prepare the complete customer data
    const completeCustomerData = {
      ...customerData,
      // Include property address - making sure it's properly formatted
      address: propertyData.address ? {
        streetAddress: propertyData.address.streetAddress || 
                      (propertyData.address.formattedAddress || ''),
        unit: propertyData.address.unit || '',
        city: propertyData.address.city || '',
        state: propertyData.address.state || '',
        zipCode: propertyData.address.zipCode || '',
        country: propertyData.address.country || 'USA',
        latitude: propertyData.address.latitude || null,
        longitude: propertyData.address.longitude || null
      } : null
    };
    
    // Pass the customer data up to the parent component
    onCustomerDetailsSubmit(completeCustomerData);
  };
  
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <p>Processing customer information...</p>
      </LoadingContainer>
    );
  }
  
  return (
    <Container>
      <Title>Customer Information</Title>
      
      <InfoText>
        This information will be used to create or update a customer record in 
        our system for service tracking and communication.
      </InfoText>
      
      {searching && (
        <StatusMessage type="info">
          Searching for existing customer records...
        </StatusMessage>
      )}
      
      {error && (
        <StatusMessage type={error.type || 'error'}>
          {error.message}
        </StatusMessage>
      )}
      
      <CustomerCard>
        <CardTitle>Contact Information</CardTitle>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              type="text"
              id="firstName"
              name="firstName"
              value={customerData.firstName}
              onChange={handleChange}
              placeholder="e.g. John"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              type="text"
              id="lastName"
              name="lastName"
              value={customerData.lastName}
              onChange={handleChange}
              placeholder="e.g. Smith"
              required
            />
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={customerData.email}
              onChange={handleChange}
              placeholder="e.g. john@example.com"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="phone">Phone</Label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              value={customerData.phone}
              onChange={handleChange}
              placeholder="e.g. 555-123-4567"
            />
          </FormGroup>
        </FormRow>
        
        <FormGroup>
          <Label htmlFor="customerType">Customer Type</Label>
          <Select
            id="customerType"
            name="customerType"
            value={customerData.customerType}
            onChange={handleChange}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="property_management">Property Management</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="companyName">Company Name (if applicable)</Label>
          <Input
            type="text"
            id="companyName"
            name="companyName"
            value={customerData.companyName}
            onChange={handleChange}
            placeholder="e.g. ABC Properties"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="notes">Additional Notes</Label>
          <Input
            as="textarea"
            id="notes"
            name="notes"
            value={customerData.notes}
            onChange={handleChange}
            placeholder="Any special instructions or notes about this customer"
            style={{ minHeight: '80px' }}
          />
        </FormGroup>
        
        {customerData.existingCustomerId && (
          <StatusMessage type="info">
            Using existing customer record ID: {customerData.existingCustomerId}
          </StatusMessage>
        )}
      </CustomerCard>
      
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

export default CustomerDetails;
