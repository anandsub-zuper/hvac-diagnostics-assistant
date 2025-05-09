// src/pages/DiagnosticTool.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import DiagnosticForm from '../components/DiagnosticForm';
import DiagnosticResult from '../components/DiagnosticResult';
import LoadingSpinner from '../components/LoadingSpinner';
import { saveDiagnosticToLocalStorage } from '../utils/storage';
import { getOfflineDiagnosticData } from '../utils/offlineDataHandler';

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

// Configure API URL based on environment
const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://hvac-diagnostics-api-f10ccd81443c.herokuapp.com';

// Use props for diagnosticData and setDiagnosticData from App.js
const DiagnosticTool = ({ isOnline, diagnosticData, setDiagnosticData }) => {
  // Use app-level state for persistent data
  const { step, systemType, systemInfo, symptoms } = diagnosticData;
  
  // We'll still need some local state for things that don't need to persist
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  // Helper functions to update individual fields in app-level state
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

  useEffect(() => {
    // Generate a unique session ID when component mounts
    setSession(`session-${Date.now()}`);
    
    // For debugging
    console.log("DiagnosticTool mounted with state:", diagnosticData);
  }, []);

  const handleSystemTypeSelect = (type) => {
    setSystemType(type);
    setStep(2);
  };

  const handleSystemInfoSubmit = (info) => {
    console.log("System info being saved:", info);
    setSystemInfo(info);
    setStep(3);
  };

  const handleSymptomsSubmit = async (symptomData) => {
    setSymptoms(symptomData);
    setIsLoading(true);
    setError(null);

    try {
      let diagnosisResult;

      if (isOnline) {
        try {
          console.log('Attempting online diagnosis with Heroku API...');
          
          // Use the Heroku API for diagnosis
          const apiUrl = new URL('api/diagnose', API_URL).toString();
          console.log('Using API URL:', apiUrl); // Debug logging
          const response = await axios.post(apiUrl, {
            systemType,
            systemInfo,
            symptoms: symptomData
          }, { 
            timeout: 25000, // 25 second timeout to stay under Heroku's 30s limit
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
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError('Unable to complete diagnosis. Please try again later.');
    } finally {
      setIsLoading(false);
      setStep(4);
    }
  };

  const resetDiagnostic = () => {
    // Reset all app-level state
    setDiagnosticData({
      step: 1,
      systemType: '',
      systemInfo: {},
      symptoms: ''
    });
    
    // Reset local state
    setDiagnosticResult(null);
    setError(null);
    setSession(`session-${Date.now()}`);
  };

  // When using the app in development, print info to help with debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API URL:', API_URL);
      console.log('Online status:', isOnline);
      console.log('Current diagnostic data:', diagnosticData);
    }
  }, [isOnline, diagnosticData]);

  return (
    <Container>
      <h1>HVAC System Diagnostics Assistant</h1>
      
      {!isOnline && (
        <OfflineMessage>
          You are currently offline. Using cached diagnostic data.
        </OfflineMessage>
      )}

      {step === 1 && (
        <DiagnosticForm 
          formType="systemType"
          onSubmit={handleSystemTypeSelect}
        />
      )}

      {step === 2 && (
        <DiagnosticForm 
          formType="systemInfo"
          systemType={systemType}
          initialFormData={systemInfo} // Pass the saved system info to preserve it
          onSubmit={handleSystemInfoSubmit}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <DiagnosticForm 
          formType="symptoms"
          systemType={systemType}
          onSubmit={handleSymptomsSubmit}
          onBack={() => setStep(2)}
        />
      )}

      {isLoading && <LoadingSpinner />}

      {step === 4 && !isLoading && (
        <DiagnosticResult 
          result={diagnosticResult}
          error={error}
          onReset={resetDiagnostic}
          isOffline={!isOnline}
        />
      )}
    </Container>
  );
};

export default DiagnosticTool;
