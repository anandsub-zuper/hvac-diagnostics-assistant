// src/components/DiagnosticForm.js
import React, { useState } from 'react';
import styled from 'styled-components';

const FormContainer = styled.div`
  margin-bottom: 20px;
`;

const FormTitle = styled.h2`
  margin-bottom: 20px;
  color: #2c3e50;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
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
`;

const SelectionCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #3498db;
  }
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  min-height: 100px;
`;

// System type selection cards
const SystemTypeForm = ({ onSubmit }) => {
  const systemTypes = [
    { id: 'central-ac', name: 'Central Air Conditioning' },
    { id: 'heat-pump', name: 'Heat Pump' },
    { id: 'furnace', name: 'Furnace' },
    { id: 'boiler', name: 'Boiler' },
    { id: 'mini-split', name: 'Mini-Split / Ductless System' },
    { id: 'package-unit', name: 'Package Unit' }
  ];

  return (
    <FormContainer>
      <FormTitle>Select HVAC System Type</FormTitle>
      
      {systemTypes.map(type => (
        <SelectionCard 
          key={type.id} 
          onClick={() => onSubmit(type.id)}
        >
          <h3>{type.name}</h3>
          <p>Click to select this system type</p>
        </SelectionCard>
      ))}
    </FormContainer>
  );
};

// System information form
const SystemInfoForm = ({ systemType, onSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    age: '',
    lastServiced: '',
    additionalInfo: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Get fields based on system type
  const getSystemSpecificFields = () => {
    switch (systemType) {
      case 'central-ac':
        return (
          <FormGroup>
            <Label htmlFor="tonnage">System Size (Tons)</Label>
            <Select 
              id="tonnage" 
              name="tonnage" 
              value={formData.tonnage || ''} 
              onChange={handleChange}
            >
              <option value="">Select tonnage</option>
              <option value="1.5">1.5 Tons</option>
              <option value="2">2 Tons</option>
              <option value="2.5">2.5 Tons</option>
              <option value="3">3 Tons</option>
              <option value="3.5">3.5 Tons</option>
              <option value="4">4 Tons</option>
              <option value="5">5 Tons</option>
              <option value="unknown">Unknown</option>
            </Select>
          </FormGroup>
        );
        
      case 'furnace':
        return (
          <FormGroup>
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select 
              id="fuelType" 
              name="fuelType" 
              value={formData.fuelType || ''} 
              onChange={handleChange}
            >
              <option value="">Select fuel type</option>
              <option value="natural-gas">Natural Gas</option>
              <option value="propane">Propane</option>
              <option value="oil">Oil</option>
              <option value="electric">Electric</option>
            </Select>
          </FormGroup>
        );
        
      default:
        return null;
  // In SystemInfoForm component in DiagnosticForm.js

// Add import
import CameraCapture from './CameraCapture';

// Add to state
const [showCamera, setShowCamera] = useState(false);

// Add handler for detected system info
const handleSystemInfoDetected = (detectedInfo) => {
  // Update form with detected information
  setFormData({
    ...formData,
    ...detectedInfo
  });
  
  setShowCamera(false); // Hide camera after successful detection
};

// Add this button to your form
<Button 
  type="button" 
  onClick={() => setShowCamera(!showCamera)}
>
  {showCamera ? 'Hide Camera' : 'Scan System with Camera'}
</Button>

// Add camera component when shown
{showCamera && (
  <CameraCapture 
    onSystemInfoDetected={handleSystemInfoDetected}
  />
)}
    }
  };

  return (
    <FormContainer>
      <FormTitle>System Information</FormTitle>
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="brand">Brand/Manufacturer</Label>
          <Input 
            type="text" 
            id="brand" 
            name="brand" 
            value={formData.brand} 
            onChange={handleChange} 
            placeholder="e.g., Carrier, Trane, Lennox"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="model">Model Number (if known)</Label>
          <Input 
            type="text" 
            id="model" 
            name="model" 
            value={formData.model} 
            onChange={handleChange} 
            placeholder="e.g., XR14"
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="age">System Age</Label>
          <Select 
            id="age" 
            name="age" 
            value={formData.age} 
            onChange={handleChange}
          >
            <option value="">Select age range</option>
            <option value="0-5">0-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="11-15">11-15 years</option>
            <option value="16-20">16-20 years</option>
            <option value="20+">Over 20 years</option>
            <option value="unknown">Unknown</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="lastServiced">Last Serviced</Label>
          <Select 
            id="lastServiced" 
            name="lastServiced" 
            value={formData.lastServiced} 
            onChange={handleChange}
          >
            <option value="">Select timeframe</option>
            <option value="0-6">Within 6 months</option>
            <option value="6-12">6-12 months ago</option>
            <option value="1-2">1-2 years ago</option>
            <option value="2+">Over 2 years ago</option>
            <option value="never">Never</option>
            <option value="unknown">Unknown</option>
          </Select>
        </FormGroup>
        
        {getSystemSpecificFields()}
        
        <FormGroup>
          <Label htmlFor="additionalInfo">Additional Information</Label>
          <TextArea 
            id="additionalInfo" 
            name="additionalInfo" 
            value={formData.additionalInfo} 
            onChange={handleChange} 
            placeholder="Any other details about your system"
          />
        </FormGroup>
        
        <ButtonContainer>
          <Button type="button" onClick={onBack}>Back</Button>
          <Button type="submit" primary>Next</Button>
        </ButtonContainer>
      </form>
    </FormContainer>
  );
};

// Symptoms form
const SymptomsForm = ({ systemType, onSubmit, onBack }) => {
  const [symptomType, setSymptomType] = useState('');
  const [additionalSymptoms, setAdditionalSymptoms] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const fullSymptomDescription = symptomType 
      ? `${symptomType}. ${additionalSymptoms}` 
      : additionalSymptoms;
    
    onSubmit(fullSymptomDescription);
  };
  
  // Get common symptoms based on system type
  const getCommonSymptoms = () => {
    switch (systemType) {
      case 'central-ac':
        return [
          { id: 'not-cooling', text: 'System is not cooling' },
          { id: 'weak-airflow', text: 'Weak or reduced airflow' },
          { id: 'making-noise', text: 'System is making unusual noises' },
          { id: 'freezing-up', text: 'System is freezing up' },
          { id: 'leaking', text: 'System is leaking water' }
        ];
      
      case 'furnace':
        return [
          { id: 'no-heat', text: 'Furnace is not producing heat' },
          { id: 'insufficient-heat', text: 'Not enough heat' },
          { id: 'short-cycling', text: 'Furnace turns on and off frequently' },
          { id: 'blowing-cold', text: 'Blowing cold air' },
          { id: 'unusual-smell', text: 'Unusual smell when running' }
        ];
        
      case 'heat-pump':
        return [
          { id: 'not-heating', text: 'Not heating in winter' },
          { id: 'not-cooling', text: 'Not cooling in summer' },
          { id: 'ice-buildup', text: 'Ice building up on outdoor unit' },
          { id: 'running-constantly', text: 'Running constantly' },
          { id: 'making-noise', text: 'Making unusual noises' }
        ];
        
      default:
        return [
          { id: 'not-working', text: 'System not working' },
          { id: 'strange-noise', text: 'Making strange noises' },
          { id: 'poor-performance', text: 'Poor performance' },
          { id: 'leaking', text: 'System is leaking' }
        ];
    }
  };
  
  return (
    <FormContainer>
      <FormTitle>Describe the Problem</FormTitle>
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Select Common Symptom</Label>
          {getCommonSymptoms().map(symptom => (
            <div key={symptom.id} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="radio"
                  name="symptomType"
                  value={symptom.text}
                  checked={symptomType === symptom.text}
                  onChange={() => setSymptomType(symptom.text)}
                  style={{ marginRight: '10px' }}
                />
                {symptom.text}
              </label>
            </div>
          ))}
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="additionalSymptoms">Additional Details</Label>
          <TextArea 
            id="additionalSymptoms" 
            value={additionalSymptoms} 
            onChange={(e) => setAdditionalSymptoms(e.target.value)} 
            placeholder="Describe the issue in more detail. When did it start? Are there any unusual sounds, smells, or behaviors?"
          />
        </FormGroup>
        
        <ButtonContainer>
          <Button type="button" onClick={onBack}>Back</Button>
          <Button type="submit" primary>Diagnose</Button>
        </ButtonContainer>
      </form>
    </FormContainer>
  );
};

// Main form component that conditionally renders the correct form based on the current step
const DiagnosticForm = ({ formType, systemType, onSubmit, onBack }) => {
  switch (formType) {
    case 'systemType':
      return <SystemTypeForm onSubmit={onSubmit} />;
      
    case 'systemInfo':
      return <SystemInfoForm systemType={systemType} onSubmit={onSubmit} onBack={onBack} />;
      
    case 'symptoms':
      return <SymptomsForm systemType={systemType} onSubmit={onSubmit} onBack={onBack} />;
      
    default:
      return <div>Unknown form type</div>;
  }
};

export default DiagnosticForm;
