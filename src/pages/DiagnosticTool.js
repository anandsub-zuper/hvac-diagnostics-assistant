// src/pages/DiagnosticTool.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import DiagnosticForm from '../components/DiagnosticForm';
import DiagnosticResult from '../components/DiagnosticResult';
import LoadingSpinner from '../components/LoadingSpinner';
import LocationDetector from '../components/LocationDetector';
import AddressConfirmation from '../components/AddressConfirmation';
import PropertyDetails from '../components/PropertyDetails';
import CustomerDetails from '../components/CustomerDetails';
import AssetCreation from '../components/AssetCreation';
import JobCreation from '../components/JobCreation';
import { saveDiagnosticToLocalStorage } from '../utils/storage';
import { getOfflineDiagnosticData } from '../utils/offlineDataHandler';
import zuperService from '../services/zuperService';

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const OfflineMessage = styled.div`
  background-color: #fff3cd;
  color: #856404;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 5px;
  font-weight: bold;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #f1f1f1;
  border-radius: 5px;
  margin-bottom: 30px;
  overflow: hidden;
`;

const Progress = styled.div`
  height: 100%;
  width: ${props => props.progress}%;
  background-color: #3498db;
  transition: width 0.5s ease;
`;

const BackButton = styled.button`
  background-color: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 16px;

  &:hover {
    text-decoration: underline;
  }

  &:before {
    content: "←";
    margin-right: 0.5rem;
  }
`;

const WorkflowStep = styled.div`
  margin-bottom: 30px;
`;

const CompletionMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  background-color: #d4edda;
  border-radius: 8px;
  margin-bottom: 30px;
`;

const CompletionIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const CompletionTitle = styled.h2`
  margin-bottom: 15px;
  color: #155724;
`;

const Button = styled.button`
  background-color: ${props => props.primary ? '#3498db' : '#e0e0e0'};
  color: ${props => props.primary ? 'white' : '#333'};
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;

  &:hover {
    background-color: ${props => props.primary ? '#2980b9' : '#d0d0d0'};
  }
`;

// Configure API URL based on environment
const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

// Modified DiagnosticTool component to include location and property workflow
const DiagnosticTool = ({ isOnline, diagnosticData, setDiagnosticData }) => {
  // Define workflow steps
  const STEPS = {
    LOCATION: 0,
    ADDRESS: 1,
    PROPERTY: 2,
    CUSTOMER: 3,
    SYSTEM_TYPE: 4,
    SYSTEM_INFO: 5,
    SYMPTOMS: 6,
    DIAGNOSIS: 7,
    ASSET_CREATION: 8,
    JOB_CREATION: 9,
    COMPLETION: 10
  };

  // Use app-level state for persistent data and create some local state for what we don't need to persist
  const { step, systemType, systemInfo, symptoms } = diagnosticData;

  // Local state for workflow management
  const [currentStep, setCurrentStep] = useState(STEPS.LOCATION);
  const [locationData, setLocationData] = useState(null);
  const [addressData, setAddressData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [zuperIds, setZuperIds] = useState({
    customerId: null,
    propertyId: null
  });
  const [assets, setAssets] = useState([]);

  // State for diagnosis
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  // Initialize session ID
  useEffect(() => {
    setSession(`session-${Date.now()}`);
  }, []);

  // Calculate progress for progress bar
  const calculateProgress = () => {
    const totalSteps = Object.keys(STEPS).length;
    return ((currentStep + 1) / totalSteps) * 100;
  };

  // Helper functions to update app-level state
  const setStep = (newStep) => {
    setDiagnosticData({
      ...diagnosticData,
      step: newStep
    });
  };

  const setSystemType = (newType) => {
    setDiagnosticData({
      ...diagnosticData,
      systemType: newType
    });
  };

  const setSystemInfo = (newInfo) => {
    setDiagnosticData({
      ...diagnosticData,
      systemInfo: newInfo
    });
  };

  const setSymptoms = (newSymptoms) => {
    setDiagnosticData({
      ...diagnosticData,
      symptoms: newSymptoms
    });
  };

  // Handle location detection
  const handleLocationDetected = (location) => {
    setLocationData(location);
    setAddressData(location);
    setCurrentStep(STEPS.ADDRESS);
  };

  // Handle skipping location detection
  const handleSkipLocation = () => {
    setCurrentStep(STEPS.ADDRESS);
  };

  // Handle address confirmation
  const handleAddressConfirmed = (address) => {
    setAddressData(address);
    setCurrentStep(STEPS.PROPERTY);
  };

  // Handle property details submission
  const handlePropertyDetailsSubmit = (property) => {
    setPropertyData(property);
    setCurrentStep(STEPS.CUSTOMER);
  };

  // Handle customer details submission
  const handleCustomerDetailsSubmit = async (customer) => {
    setCustomerData(customer);

    // Create customer and property in Zuper
    if (isOnline) {
      setIsLoading(true);

      try {
        // Check if we have an existing customer ID
        let customerId = customer.existingCustomerId;
        console.log("Initial customer ID (from existing):", customerId);

        // If no existing customer, create one
        if (!customerId) {
          console.log('Creating new customer:', customer.firstName, customer.lastName);
          const createdCustomer = await zuperService.createCustomer(customer);
           console.log('Customer creation response:', createdCustomer);
          customerId = createdCustomer.id;
        }

        if (!customerId) {
          console.error('Failed to get customer ID from response');
          throw new Error('Customer creation did not return an ID');
        }

         console.log('New customer created with ID:', customerId);

        // Create property for the customer
        const createdProperty = await zuperService.createProperty(customerId, propertyData);

        // Save the IDs
        setZuperIds({
          customerId,
          propertyId: createdProperty.id
        });
      } catch (err) {
        console.error('Error creating customer/property in Zuper:', err);
        // Continue anyway - we'll allow local diagnosis without Zuper integration
      } finally {
        setIsLoading(false);
      }
    }

    console.log('Zuper integration complete');
      console.log('Customer ID:', customerId);
      console.log('Property ID:', propertyId);
    } catch (err) {
      console.error('Error with Zuper integration:', err);
      // Log the full error for debugging
      console.error('Full error details:', err);
    } finally {
      setIsLoading(false);
    }
  }

    // Continue to HVAC system type selection
    setCurrentStep(STEPS.SYSTEM_TYPE);
  };

  // Handle system type selection
  const handleSystemTypeSelect = (type) => {
    setSystemType(type);
    setCurrentStep(STEPS.SYSTEM_INFO);
  };

  // Handle system info submission
  const handleSystemInfoSubmit = (info) => {
    setSystemInfo(info);
    setCurrentStep(STEPS.SYMPTOMS);
  };

  // Handle symptoms submission
  const handleSymptomsSubmit = async (symptomData) => {
    setSymptoms(symptomData);
    setIsLoading(true);
    setError(null);

    try {
      let diagnosisResult;

      if (isOnline) {
        try {
          console.log('Attempting online diagnosis with API...');

          // Use the API for diagnosis
          const apiUrl = new URL('api/diagnose', API_URL).toString();
          console.log('Using API URL:', apiUrl);

          const response = await axios.post(apiUrl, {
            systemType,
            systemInfo,
            symptoms: symptomData
          }, {
            timeout: 25000,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          diagnosisResult = response.data;
          console.log('Diagnosis result received:', diagnosisResult);

          // Add source information
          diagnosisResult.source = 'ai';
        } catch (onlineError) {
          console.warn('Online diagnosis failed, falling back to offline mode:', onlineError);

          // Fall back to offline diagnosis
          diagnosisResult = await getOfflineDiagnosticData(
            systemType,
            systemInfo,
            symptomData
          );

          // Add note about fallback
          diagnosisResult.note = "Using offline diagnosis due to connection issues with AI service.";
          diagnosisResult.source = 'offline';
        }
      } else {
        // Offline mode - use cached data
        console.log('Using offline diagnostic data...');
        diagnosisResult = await getOfflineDiagnosticData(
          systemType,
          systemInfo,
          symptomData
        );
        diagnosisResult.source = 'offline';
      }

      setDiagnosticResult(diagnosisResult);

      // Save to local storage for offline access
      if (diagnosisResult) {
        const diagnosticToSave = {
          id: session,
          timestamp: new Date().toISOString(),
          systemType,
          systemInfo,
          symptoms: symptomData,
          result: diagnosisResult
        };

        console.log('Saving diagnostic to local storage:', diagnosticToSave);
        saveDiagnosticToLocalStorage(diagnosticToSave);
      }

      // Continue to diagnosis step
      setCurrentStep(STEPS.DIAGNOSIS);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError('Unable to complete diagnosis. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle asset creation
  const handleAssetCreated = (asset) => {
    setAssets(prev => [...prev, asset]);
  };

  // Handle job creation
  const handleJobCreated = (job) => {
    // Continue to completion step
    setCurrentStep(STEPS.COMPLETION);
  };

  // Restart the workflow
  const resetWorkflow = () => {
    setCurrentStep(STEPS.LOCATION);
    setLocationData(null);
    setAddressData(null);
    setPropertyData(null);
    setCustomerData(null);
    setZuperIds({
      customerId: null,
      propertyId: null
    });
    setAssets([]);
    setDiagnosticResult(null);
    setError(null);
    setSession(`session-${Date.now()}`);

    // Reset app-level state
    setDiagnosticData({
      step: 1,
      systemType: '',
      systemInfo: {},
      symptoms: ''
    });
  };

  // Handle moving to asset creation after diagnosis
  const handleContinueToAssetCreation = () => {
    setCurrentStep(STEPS.ASSET_CREATION);
  };

  // Handle moving to job creation after asset creation
  const handleContinueToJobCreation = () => {
    setCurrentStep(STEPS.JOB_CREATION);
  };

  // Handle going back a step
  const handleBack = () => {
    // Don't allow going back from location step
    if (currentStep === STEPS.LOCATION) {
      return;
    }

    // Go back one step
    setCurrentStep(prev => prev - 1);
  };

  // Render the correct component based on current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.LOCATION:
        return (
          <LocationDetector
            onLocationDetected={handleLocationDetected}
            onSkip={handleSkipLocation}
          />
        );

      case STEPS.ADDRESS:
        return (
          <AddressConfirmation
            initialAddress={addressData}
            onAddressConfirmed={handleAddressConfirmed}
            onBack={handleBack}
          />
        );

      case STEPS.PROPERTY:
        return (
          <PropertyDetails
            address={addressData}
            onPropertyDetailsSubmit={handlePropertyDetailsSubmit}
            onBack={handleBack}
          />
        );

      case STEPS.CUSTOMER:
        return (
          <CustomerDetails
            propertyData={propertyData}
            onCustomerDetailsSubmit={handleCustomerDetailsSubmit}
            onBack={handleBack}
          />
        );

      case STEPS.SYSTEM_TYPE:
        return (
          <DiagnosticForm
            formType="systemType"
            onSubmit={handleSystemTypeSelect}
            onBack={handleBack}
          />
        );

      case STEPS.SYSTEM_INFO:
        return (
          <DiagnosticForm
            formType="systemInfo"
            systemType={systemType}
            initialFormData={systemInfo}
            onSubmit={handleSystemInfoSubmit}
            onBack={handleBack}
          />
        );

      case STEPS.SYMPTOMS:
        return (
          <DiagnosticForm
            formType="symptoms"
            systemType={systemType}
            onSubmit={handleSymptomsSubmit}
            onBack={handleBack}
          />
        );

      case STEPS.DIAGNOSIS:
        if (isLoading) {
          return <LoadingSpinner />;
        }

        return (
          <div>
            <DiagnosticResult
              result={diagnosticResult}
              error={error}
              onReset={resetWorkflow}
              isOffline={!isOnline}
            />
            <Button primary onClick={handleContinueToAssetCreation}>
              Create Equipment Record & Service Job
            </Button>
          </div>
        );

      case STEPS.ASSET_CREATION:
        return (
          <AssetCreation
            systemInfo={systemInfo}
            customerData={customerData}
            propertyData={propertyData}
            zuperIds={zuperIds}
            onAssetCreated={handleAssetCreated}
            onBack={handleBack}
            onContinue={handleContinueToJobCreation}
          />
        );

      case STEPS.JOB_CREATION:
        return (
          <JobCreation
            diagnosticResult={diagnosticResult}
            zuperIds={zuperIds}
            assets={assets}
            onJobCreated={handleJobCreated}
            onBack={handleBack}
            onComplete={() => setCurrentStep(STEPS.COMPLETION)}
          />
        );

      case STEPS.COMPLETION:
        return (
          <CompletionMessage>
            <CompletionIcon>✅</CompletionIcon>
            <CompletionTitle>Process Complete!</CompletionTitle>
            <p>The customer, property, equipment, and service job have been created successfully.</p>
            <Button primary onClick={resetWorkflow}>
              Start New Diagnosis
            </Button>
          </CompletionMessage>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Container>
      <h1>HVAC System Diagnostics Assistant</h1>

      {!isOnline && (
        <OfflineMessage>
          You are currently offline. Using cached diagnostic data.
        </OfflineMessage>
      )}

      <ProgressBar>
        <Progress progress={calculateProgress()} />
      </ProgressBar>

      {currentStep > STEPS.LOCATION && (
        <BackButton onClick={handleBack}>
          Back
        </BackButton>
      )}

      <WorkflowStep>
        {renderCurrentStep()}
      </WorkflowStep>
    </Container>
  );
};

export default DiagnosticTool;
