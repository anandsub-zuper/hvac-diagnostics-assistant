// Fixed CustomerDetails component to better handle customer search results

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import zuperService from '../services/zuperService';

const Container = styled.div`
  margin-bottom: 20px;
`;

// Other styled components remain the same...

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
        
        // If we have an email or phone, try to search for existing customer in Zuper
        if (contactInfo.email || contactInfo.phone) {
          searchForExistingCustomer(contactInfo.email, contactInfo.phone);
        }
      }
    }
  }, [propertyData]);
  
  // Search for existing customer in Zuper with improved handling
  const searchForExistingCustomer = async (email, phone) => {
    if (!email && !phone) return;
    
    setSearching(true);
    setError(null); // Clear any previous errors
    
    try {
      // Added timeout to ensure UI feedback for the search
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
        
        // Make sure we're getting valid data
        if (existingCustomer.first_name || existingCustomer.last_name || 
            existingCustomer.email || existingCustomer.phone) {
          
          setCustomerData({
            firstName: existingCustomer.first_name || '',
            lastName: existingCustomer.last_name || '',
            email: existingCustomer.email || email || '',
            phone: existingCustomer.phone || phone || '',
            companyName: existingCustomer.company_name || '',
            notes: existingCustomer.notes || '',
            customerType: existingCustomer.customer_type || 'residential',
            existingCustomerId: existingCustomer.id
          });
          
          // Show success message
          setError({
            type: 'success',
            message: 'Found existing customer in our records. Information has been pre-filled.'
          });
        } else {
          console.warn('Found customer but with incomplete data:', existingCustomer);
          // Don't show success message if data is incomplete
        }
      } else {
        // No existing customer found - we'll create a new one later
        console.log('No existing customer found with email:', email, 'or phone:', phone);
        // Don't show any message to the user - just continue with form
      }
    } catch (err) {
      console.error('Error searching for customer:', err);
      // Show a non-blocking error
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
      // Include property address
      address: propertyData.address
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
      
      {/* Rest of the component remains the same... */}
      
    </Container>
  );
};

export default CustomerDetails;
