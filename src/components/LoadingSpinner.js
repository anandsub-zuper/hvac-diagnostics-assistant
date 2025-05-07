// src/components/LoadingSpinner.js
import React from 'react';
import styled, { keyframes } from 'styled-components';

// Create a spinning animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Create a pulse animation
const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.6; transform: scale(0.8); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  margin: 20px 0;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border-left-color: #3498db;
  animation: ${spin} 1s linear infinite;
`;

const DiagnosingText = styled.div`
  margin-top: 20px;
  font-size: 18px;
  color: #3498db;
  font-weight: bold;
`;

const DiagnosingSubtext = styled.div`
  margin-top: 10px;
  font-size: 14px;
  color: #7f8c8d;
  max-width: 400px;
  text-align: center;
`;

const IconContainer = styled.div`
  margin-top: 15px;
  display: flex;
  justify-content: center;
`;

const Icon = styled.div`
  font-size: 18px;
  margin: 0 6px;
  animation: ${pulse} 2s infinite;
  animation-delay: ${props => props.delay || '0s'};
`;

const LoadingSpinner = ({ text = 'Analyzing HVAC Issue' }) => {
  return (
    <SpinnerContainer>
      <Spinner />
      <DiagnosingText>{text}</DiagnosingText>
      <DiagnosingSubtext>
        Our AI is analyzing your HVAC symptoms and comparing with known issues to provide an accurate diagnosis.
      </DiagnosingSubtext>
      
      <IconContainer>
        <Icon delay="0s">🔍</Icon>
        <Icon delay="0.5s">📊</Icon>
        <Icon delay="1s">🔧</Icon>
      </IconContainer>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;
