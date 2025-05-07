// src/components/DiagnosticResult.js
import React from 'react';
import styled from 'styled-components';

const ResultContainer = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
`;

const ResultHeader = styled.div`
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
`;

const ResultTitle = styled.h2`
  color: #2c3e50;
  margin-bottom: 10px;
`;

const ResultSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  color: #3498db;
  margin-bottom: 10px;
`;

const IssueCard = styled.div`
  background-color: ${props => {
    switch (props.severity) {
      case 'High':
        return 'rgba(231, 76, 60, 0.1)';
      case 'Medium':
        return 'rgba(243, 156, 18, 0.1)';
      case 'Low':
        return 'rgba(46, 204, 113, 0.1)';
      default:
        return 'rgba(189, 195, 199, 0.1)';
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.severity) {
      case 'High':
        return '#e74c3c';
      case 'Medium':
        return '#f39c12';
      case 'Low':
        return '#2ecc71';
      default:
        return '#bdc3c7';
    }
  }};
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 4px;
`;

const IssueTitle = styled.h4`
  margin-top: 0;
  margin-bottom: 5px;
`;

const IssueSeverity = styled.span`
  font-size: 12px;
  font-weight: bold;
  color: ${props => {
    switch (props.severity) {
      case 'High':
        return '#e74c3c';
      case 'Medium':
        return '#f39c12';
      case 'Low':
        return '#2ecc71';
      default:
        return '#bdc3c7';
    }
  }};
  text-transform: uppercase;
  margin-left: 10px;
`;

const StepsList = styled.ol`
  margin: 0;
  padding-left: 20px;
`;

const Step = styled.li`
  margin-bottom: 8px;
  line-height: 1.5;
`;

const ItemsList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const Item = styled.li`
  margin-bottom: 5px;
`;

const ComplexityIndicator = styled.div`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  color: white;
  background-color: ${props => {
    switch (props.complexity) {
      case 'Easy':
        return '#2ecc71';
      case 'Moderate':
        return '#f39c12';
      case 'Complex':
        return '#e74c3c';
      default:
        return '#bdc3c7';
    }
  }};
`;

const Notes = styled.div`
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #3498db;
  font-style: italic;
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  padding: 15px;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 4px;
  margin-bottom: 20px;
`;

const OfflineBadge = styled.span`
  background-color: #95a5a6;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
  text-transform: uppercase;
`;

const ButtonRow = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
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

const DiagnosticResult = ({ result, error, onReset, isOffline }) => {
  if (error) {
    return (
      <ResultContainer>
        <ErrorMessage>
          <h3>Diagnostic Error</h3>
          <p>{error}</p>
        </ErrorMessage>
        <ButtonRow>
          <Button onClick={onReset} primary>Try Again</Button>
        </ButtonRow>
      </ResultContainer>
    );
  }

  if (!result) {
    return (
      <ResultContainer>
        <p>No diagnostic result available.</p>
        <ButtonRow>
          <Button onClick={onReset} primary>Start New Diagnosis</Button>
        </ButtonRow>
      </ResultContainer>
    );
  }

  // Handle non-standard API responses
  if (result.rawResponse) {
    return (
      <ResultContainer>
        <ResultHeader>
          <ResultTitle>
            Diagnostic Result
            {isOffline && <OfflineBadge>Offline</OfflineBadge>}
          </ResultTitle>
        </ResultHeader>
        
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {result.rawResponse}
        </pre>
        
        <ButtonRow>
          <Button onClick={onReset} primary>Start New Diagnosis</Button>
        </ButtonRow>
      </ResultContainer>
    );
  }

  return (
    <ResultContainer>
      <ResultHeader>
        <ResultTitle>
          Diagnostic Result
          {isOffline && <OfflineBadge>Offline</OfflineBadge>}
        </ResultTitle>
        {result.source && (
          <p>
            <strong>Source:</strong> {result.source === 'cached' ? 'Previously saved diagnosis' : 
                                      result.source === 'predefined' ? 'Common issue database' : 
                                      'OpenAI diagnostic'}
          </p>
        )}
      </ResultHeader>
      
      {result.possibleIssues && result.possibleIssues.length > 0 && (
        <ResultSection>
          <SectionTitle>Possible Issues</SectionTitle>
          {result.possibleIssues.map((issue, index) => (
            <IssueCard key={index} severity={issue.severity}>
              <IssueTitle>
                {issue.issue}
                <IssueSeverity severity={issue.severity}>
                  {issue.severity}
                </IssueSeverity>
              </IssueTitle>
              {issue.description && <p>{issue.description}</p>}
            </IssueCard>
          ))}
        </ResultSection>
      )}
      
      {result.troubleshooting && result.troubleshooting.length > 0 && (
        <ResultSection>
          <SectionTitle>Troubleshooting Steps</SectionTitle>
          <StepsList>
            {result.troubleshooting.map((step, index) => (
              <Step key={index}>{step}</Step>
            ))}
          </StepsList>
        </ResultSection>
      )}
      
      {result.requiredItems && result.requiredItems.length > 0 && (
        <ResultSection>
          <SectionTitle>Required Tools & Parts</SectionTitle>
          <ItemsList>
            {result.requiredItems.map((item, index) => (
              <Item key={index}>{item}</Item>
            ))}
          </ItemsList>
        </ResultSection>
      )}
      
      {result.repairComplexity && (
        <ResultSection>
          <SectionTitle>Repair Complexity</SectionTitle>
          <ComplexityIndicator complexity={result.repairComplexity}>
            {result.repairComplexity}
          </ComplexityIndicator>
        </ResultSection>
      )}
      
      {(result.additionalNotes || result.note) && (
        <ResultSection>
          <SectionTitle>Additional Notes</SectionTitle>
          <Notes>
            {result.additionalNotes && <p>{result.additionalNotes}</p>}
            {result.note && <p>{result.note}</p>}
          </Notes>
        </ResultSection>
      )}
      
      <ButtonRow>
        <Button onClick={onReset} primary>Start New Diagnosis</Button>
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </ButtonRow>
    </ResultContainer>
  );
};

export default DiagnosticResult;
