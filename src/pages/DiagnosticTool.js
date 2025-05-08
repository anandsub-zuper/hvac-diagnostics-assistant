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

const DiagnosticTool = ({ isOnline }) => {
  const [step, setStep] = useState(1);
  const [systemType, setSystemType] = useState('');
  const [, setSymptoms] = useState('');
  const [systemInfo, setSystemInfo] = useState({});
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Generate a unique session ID when component mounts
    setSession(`session-${Date.now()}`);
  }, []);

  const handleSystemTypeSelect = (type) => {
    setSystemType(type);
    setStep(2);
  };

  const handleSystemInfoSubmit = (info) => {
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
        // Online mode - use OpenAI API
        const response = await axios.post('/api/diagnose', {
          systemType,
          systemInfo,
          symptoms: symptomData
        });
        diagnosisResult = response.data;
      } else {
        // Offline mode - use cached data
        diagnosisResult = await getOfflineDiagnosticData(
          systemType, 
          systemInfo, 
          symptomData
        );
      }

      setDiagnosticResult(diagnosisResult);
      
      // Save to local storage for offline access
      if (diagnosisResult) {
        saveDiagnosticToLocalStorage({
          id: session,
          timestamp: new Date().toISOString(),
          systemType,
          systemInfo,
          symptoms: symptomData,
          result: diagnosisResult
        });
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
    setStep(1);
    setSystemType('');
    setSymptoms('');
    setSystemInfo({});
    setDiagnosticResult(null);
    setError(null);
    setSession(`session-${Date.now()}`);
  };

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
