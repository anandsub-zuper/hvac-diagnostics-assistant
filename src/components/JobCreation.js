// src/components/JobCreation.js
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

const JobCard = styled.div`
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

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  min-height: 100px;
  resize: vertical;
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

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const DiagnosticSummary = styled.div`
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 0 4px 4px 0;
`;

const JobCreation = ({
  diagnosticResult,
  zuperIds,
  assets,
  onJobCreated,
  onBack,
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [jobCategories, setJobCategories] = useState([]);
  
  // Format today's date as YYYY-MM-DD for default due date
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  
  // Generate job title based on diagnostic result
  const defaultJobTitle = diagnosticResult && diagnosticResult.primaryIssue 
    ? `HVAC Service: ${diagnosticResult.primaryIssue}` 
    : "HVAC Service Request";
    
  // Create default description from diagnostic result
  const createDefaultDescription = () => {
    if (!diagnosticResult) return "";
    
    let description = "";
    
    // Add primary issue
    if (diagnosticResult.primaryIssue) {
      description += `Primary Issue: ${diagnosticResult.primaryIssue}\n\n`;
    }
    
    // Add possible issues
    if (diagnosticResult.possibleIssues && diagnosticResult.possibleIssues.length > 0) {
      description += "Possible Issues:\n";
      diagnosticResult.possibleIssues.forEach(issue => {
        description += `- ${issue.issue} (${issue.severity}): ${issue.description}\n`;
      });
      description += "\n";
    }
    
    // Add required items
    if (diagnosticResult.requiredItems && diagnosticResult.requiredItems.length > 0) {
      description += "Required Items:\n";
      diagnosticResult.requiredItems.forEach(item => {
        description += `- ${item}\n`;
      });
      description += "\n";
    }
    
    // Add repair complexity
    if (diagnosticResult.repairComplexity) {
      description += `Repair Complexity: ${diagnosticResult.repairComplexity}\n\n`;
    }
    
    // Add additional notes
    if (diagnosticResult.additionalNotes) {
      description += `Additional Notes: ${diagnosticResult.additionalNotes}\n`;
    }
    
    return description;
  };
    
  const [jobData, setJobData] = useState({
    title: defaultJobTitle,
    description: createDefaultDescription(),
    jobCategory: '',
    priority: getPriorityFromDiagnostic(diagnosticResult),
    status: 'new',
    dueDate: formattedToday,
    selectedAssets: assets.map(asset => ({
      ...asset,
      selected: true
    }))
  });
  
  // Fetch job categories when component mounts
  useEffect(() => {
    const fetchJobCategories = async () => {
      try {
        // Call method in zuperService to get job categories
        const categories = await zuperService.getJobCategories();
        setJobCategories(categories);
        
        // Set a default category if available
        if (categories.length > 0) {
          setJobData(prev => ({
            ...prev,
            jobCategory: categories[0].id
          }));
        }
      } catch (err) {
        console.error('Error fetching job categories:', err);
        setError({
          type: 'warning',
          message: 'Could not fetch job categories. Please select a category manually if available.'
        });
      }
    };
    
    fetchJobCategories();
  }, []);
  
  // Helper function to determine priority from diagnostic result
  function getPriorityFromDiagnostic(diagnostic) {
    if (!diagnostic || !diagnostic.possibleIssues || diagnostic.possibleIssues.length === 0) {
      return 'medium';
    }
    
    // Check if any high severity issues exist
    const hasHighSeverity = diagnostic.possibleIssues.some(issue => 
      issue.severity && issue.severity.toLowerCase() === 'high'
    );
    
    if (hasHighSeverity) {
      return 'high';
    }
    
    // Check if any medium severity issues exist
    const hasMediumSeverity = diagnostic.possibleIssues.some(issue => 
      issue.severity && issue.severity.toLowerCase() === 'medium'
    );
    
    if (hasMediumSeverity) {
      return 'medium';
    }
    
    // Default to low
    return 'low';
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAssetToggle = (assetId) => {
    setJobData(prev => ({
      ...prev,
      selectedAssets: prev.selectedAssets.map(asset => 
        asset.id === assetId 
          ? { ...asset, selected: !asset.selected } 
          : asset
      )
    }));
  };
  
  const validateForm = () => {
    if (!jobData.title.trim()) {
      setError({
        type: 'error',
        message: 'Job title is required'
      });
      return false;
    }
    
    if (!jobData.jobCategory) {
      setError({
        type: 'error',
        message: 'Job category is required'
      });
      return false;
    }
    
    if (!jobData.dueDate) {
      setError({
        type: 'error',
        message: 'Due date is required'
      });
      return false;
    }
    
    return true;
  };
  
  const handleCreateJob = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get selected asset IDs
      const assetIds = jobData.selectedAssets
        .filter(asset => asset.selected)
        .map(asset => asset.id);
        
      // Format job data for Zuper API
      const formattedJobData = {
        customerId: zuperIds.customerId,
        propertyId: zuperIds.propertyId,
        assetIds: assetIds,
        title: jobData.title,
        description: jobData.description,
        jobCategory: jobData.jobCategory,
        priority: jobData.priority,
        status: jobData.status,
        dueDate: jobData.dueDate,
        diagnosticResult: JSON.stringify(diagnosticResult)
      };
      
      // Create job in Zuper
      const createdJob = await zuperService.createJob(formattedJobData);
      
      // Show success message
      setSuccess(true);
      setError({
        type: 'success',
        message: 'Job created successfully!'
      });
      
      // Pass job to parent component
      if (onJobCreated) {
        onJobCreated(createdJob);
      }
    } catch (err) {
      console.error('Error creating job:', err);
      setError({
        type: 'error',
        message: `Failed to create job: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Title>Create Service Job</Title>
      
      <InfoText>
        Create a service job based on the diagnostic results to schedule a technician visit.
      </InfoText>
      
      {error && (
        <StatusMessage type={error.type || 'error'}>
          {error.message}
        </StatusMessage>
      )}
      
      {diagnosticResult && (
        <DiagnosticSummary>
          <h3>Diagnostic Summary</h3>
          <p><strong>Primary Issue:</strong> {diagnosticResult.primaryIssue || 'Unknown'}</p>
          <p><strong>Complexity:</strong> {diagnosticResult.repairComplexity || 'Unknown'}</p>
          {diagnosticResult.possibleIssues && diagnosticResult.possibleIssues.length > 0 && (
            <p><strong>Issues:</strong> {diagnosticResult.possibleIssues.map(i => i.issue).join(', ')}</p>
          )}
        </DiagnosticSummary>
      )}
      
      <JobCard>
        <CardTitle>Job Details</CardTitle>
        
        <FormGroup>
          <Label htmlFor="title">Job Title *</Label>
          <Input
            type="text"
            id="title"
            name="title"
            value={jobData.title}
            onChange={handleChange}
            placeholder="e.g. AC Repair - Not Cooling"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="description">Job Description</Label>
          <Textarea
            id="description"
            name="description"
            value={jobData.description}
            onChange={handleChange}
            placeholder="Detailed description of the job"
          />
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="jobCategory">Job Category *</Label>
            <Select
              id="jobCategory"
              name="jobCategory"
              value={jobData.jobCategory}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {jobCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              name="priority"
              value={jobData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              value={jobData.status}
              onChange={handleChange}
            >
              <option value="new">New</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </FormGroup>
        </FormRow>
        
        <FormGroup>
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            type="date"
            id="dueDate"
            name="dueDate"
            value={jobData.dueDate}
            onChange={handleChange}
            required
          />
        </FormGroup>
        
        {jobData.selectedAssets.length > 0 && (
          <FormGroup>
            <Label>Select Equipment for this Job</Label>
            <CheckboxGroup>
              {jobData.selectedAssets.map(asset => (
                <CheckboxLabel key={asset.id}>
                  <Checkbox
                    type="checkbox"
                    checked={asset.selected}
                    onChange={() => handleAssetToggle(asset.id)}
                  />
                  {asset.name} {asset.model ? `(${asset.model})` : ''}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormGroup>
        )}
      </JobCard>
      
      <ButtonContainer>
        <Button onClick={onBack}>
          Back
        </Button>
        
        <Button 
          primary 
          onClick={handleCreateJob}
          disabled={loading || success}
        >
          {loading ? 'Creating...' : success ? 'Job Created' : 'Create Service Job'}
        </Button>
        
        {success && (
          <Button 
            primary 
            onClick={onComplete}
          >
            Complete
          </Button>
        )}
      </ButtonContainer>
    </Container>
  );
};

export default JobCreation;
