// Update this in src/components/AssetCreation.js

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

const AssetCard = styled.div`
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

const AssetsList = styled.div`
  margin-top: 20px;
`;

const AssetItem = styled.div`
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.h4`
  margin: 0 0 5px 0;
  color: #2c3e50;
`;

const AssetDetail = styled.p`
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.danger ? '#e74c3c' : '#f8f9fa'};
  color: ${props => props.danger ? 'white' : '#7f8c8d'};
  border: ${props => props.danger ? 'none' : '1px solid #ddd'};
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: ${props => props.danger ? '#c0392b' : '#f1f3f5'};
  }
`;

const AssetCreation = ({
  systemInfo,
  customerData,
  propertyData,
  zuperIds,
  onAssetCreated,
  onBack,
  onContinue
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assetCategories, setAssetCategories] = useState([]);
  const [assetCategoriesLoading, setAssetCategoriesLoading] = useState(false);
  
  const [assetData, setAssetData] = useState({
    name: `${systemInfo?.brand || ''} ${systemInfo?.systemType ? formatSystemType(systemInfo.systemType) : 'HVAC System'}`,
    assetCategory: '', // Required field
    manufacturer: systemInfo?.brand || '',
    model: systemInfo?.model || '',
    serialNumber: systemInfo?.serialNumber || '',
    status: 'active',
    installationDate: '',
    warrantyExpiryDate: '',
    notes: '',
    systemType: systemInfo?.systemType || '',
    tonnage: systemInfo?.tonnage || '',
    efficiencyRating: systemInfo?.efficiencyRating || ''
  });
  
  const [createdAssets, setCreatedAssets] = useState([]);
  
  // Fetch asset categories when component mounts
  useEffect(() => {
    const fetchAssetCategories = async () => {
      setAssetCategoriesLoading(true);
      try {
        const categories = await zuperService.getAssetCategories();
        setAssetCategories(categories);
        
        // Set a default category if available
        if (categories.length > 0) {
          // Look for an HVAC-specific category first
          const hvacCategory = categories.find(cat => 
            cat.name.toLowerCase().includes('hvac') || 
            cat.name.toLowerCase().includes('equipment')
          );
          
          setAssetData(prev => ({
            ...prev,
            assetCategory: hvacCategory ? hvacCategory.id : (categories[0].id || '')
          }));
        }
      } catch (err) {
        console.error('Error fetching asset categories:', err);
        setError({
          type: 'warning',
          message: 'Could not fetch asset categories. Please select a category manually if available.'
        });
      } finally {
        setAssetCategoriesLoading(false);
      }
    };
    
    fetchAssetCategories();
  }, []);
  
  // Helper function to format system type for display
  function formatSystemType(type) {
    const displayNames = {
      "central-ac": "Central AC",
      "heat-pump": "Heat Pump",
      "furnace": "Furnace",
      "boiler": "Boiler",
      "mini-split": "Mini-Split",
      "package-unit": "Package Unit"
    };
    
    return displayNames[type] || type;
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAssetData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    if (!assetData.name.trim()) {
      setError({
        type: 'error',
        message: 'Asset name is required'
      });
      return false;
    }
    
    if (!assetData.assetCategory) {
      setError({
        type: 'error',
        message: 'Asset category is required'
      });
      return false;
    }
    
    return true;
  };
  
  const handleCreateAsset = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Format asset data for Zuper API
      const formattedAssetData = {
        name: assetData.name,
        assetCategory: assetData.assetCategory,
        manufacturer: assetData.manufacturer,
        model: assetData.model,
        serialNumber: assetData.serialNumber,
        status: assetData.status,
        customerId: zuperIds.customerId,
        propertyId: zuperIds.propertyId,
        installationDate: assetData.installationDate,
        warrantyExpiryDate: assetData.warrantyExpiryDate,
        notes: assetData.notes,
        systemType: assetData.systemType,
        tonnage: assetData.tonnage,
        efficiencyRating: assetData.efficiencyRating
      };
      
      // Create asset in Zuper
      const createdAsset = await zuperService.createAsset(formattedAssetData);
      
      // Add to list of created assets
      setCreatedAssets(prev => [
        ...prev,
        {
          id: createdAsset.id,
          name: createdAsset.name,
          manufacturer: createdAsset.manufacturer,
          model: createdAsset.model,
          serialNumber: createdAsset.serialNumber
        }
      ]);
      
      // Pass asset to parent component
      if (onAssetCreated) {
        onAssetCreated(createdAsset);
      }
      
      // Reset form for next asset
      setAssetData({
        name: `${systemInfo?.brand || ''} ${systemInfo?.systemType ? formatSystemType(systemInfo.systemType) : 'HVAC System'}`,
        assetCategory: assetData.assetCategory, // Keep the selected category
        manufacturer: systemInfo?.brand || '',
        model: systemInfo?.model || '',
        serialNumber: '',
        status: 'active',
        installationDate: '',
        warrantyExpiryDate: '',
        notes: '',
        systemType: systemInfo?.systemType || '',
        tonnage: systemInfo?.tonnage || '',
        efficiencyRating: systemInfo?.efficiencyRating || ''
      });
      
      // Show success message
      setError({
        type: 'success',
        message: 'Asset created successfully!'
      });
    } catch (err) {
      console.error('Error creating asset:', err);
      setError({
        type: 'error',
        message: `Failed to create asset: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAsset = async (assetId) => {
    // Remove from local state only
    setCreatedAssets(prev => prev.filter(asset => asset.id !== assetId));
  };
  
  if (assetCategoriesLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <p>Loading asset categories...</p>
      </LoadingContainer>
    );
  }
  
  return (
    <Container>
      <Title>Add HVAC Equipment</Title>
      
      <InfoText>
        Add the HVAC equipment installed at this property. You can add multiple 
        pieces of equipment if needed.
      </InfoText>
      
      {error && (
        <StatusMessage type={error.type || 'error'}>
          {error.message}
        </StatusMessage>
      )}
      
      <AssetCard>
        <CardTitle>Equipment Details</CardTitle>
        
        <FormGroup>
          <Label htmlFor="name">Equipment Name *</Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={assetData.name}
            onChange={handleChange}
            placeholder="e.g. Carrier Central AC"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="assetCategory">Asset Category *</Label>
          <Select
            id="assetCategory"
            name="assetCategory"
            value={assetData.assetCategory}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            {assetCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            {assetCategories.length === 0 && (
              <option value="hvac">HVAC Equipment</option>
            )}
          </Select>
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              type="text"
              id="manufacturer"
              name="manufacturer"
              value={assetData.manufacturer}
              onChange={handleChange}
              placeholder="e.g. Carrier"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="model">Model</Label>
            <Input
              type="text"
              id="model"
              name="model"
              value={assetData.model}
              onChange={handleChange}
              placeholder="e.g. XR14"
            />
          </FormGroup>
        </FormRow>
        
        <FormGroup>
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            type="text"
            id="serialNumber"
            name="serialNumber"
            value={assetData.serialNumber}
            onChange={handleChange}
            placeholder="e.g. AB123456789"
          />
        </FormGroup>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="systemType">System Type</Label>
            <Select
              id="systemType"
              name="systemType"
              value={assetData.systemType}
              onChange={handleChange}
            >
              <option value="">Select type</option>
              <option value="central-ac">Central AC</option>
              <option value="heat-pump">Heat Pump</option>
              <option value="furnace">Furnace</option>
              <option value="boiler">Boiler</option>
              <option value="mini-split">Mini-Split</option>
              <option value="package-unit">Package Unit</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="tonnage">Tonnage</Label>
            <Input
              type="text"
              id="tonnage"
              name="tonnage"
              value={assetData.tonnage}
              onChange={handleChange}
              placeholder="e.g. 3.5"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="efficiencyRating">Efficiency Rating</Label>
            <Input
              type="text"
              id="efficiencyRating"
              name="efficiencyRating"
              value={assetData.efficiencyRating}
              onChange={handleChange}
              placeholder="e.g. SEER 14"
            />
          </FormGroup>
        </FormRow>
        
        <FormRow>
          <FormGroup>
            <Label htmlFor="installationDate">Installation Date (if known)</Label>
            <Input
              type="date"
              id="installationDate"
              name="installationDate"
              value={assetData.installationDate}
              onChange={handleChange}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="warrantyExpiryDate">Warranty Expiry (if known)</Label>
            <Input
              type="date"
              id="warrantyExpiryDate"
              name="warrantyExpiryDate"
              value={assetData.warrantyExpiryDate}
              onChange={handleChange}
            />
          </FormGroup>
        </FormRow>
        
        <FormGroup>
          <Label htmlFor="notes">Notes</Label>
          <Input
            as="textarea"
            id="notes"
            name="notes"
            value={assetData.notes}
            onChange={handleChange}
            placeholder="Any special notes about this equipment"
            style={{ minHeight: '80px' }}
          />
        </FormGroup>
        
        <Button 
          primary 
          onClick={handleCreateAsset}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Add Equipment'}
        </Button>
      </AssetCard>
      
      {createdAssets.length > 0 && (
        <AssetsList>
          <h3>Added Equipment</h3>
          {createdAssets.map(asset => (
            <AssetItem key={asset.id}>
              <AssetInfo>
                <AssetName>{asset.name}</AssetName>
                <AssetDetail>
                  {asset.manufacturer} {asset.model}
                  {asset.serialNumber && ` - S/N: ${asset.serialNumber}`}
                </AssetDetail>
              </AssetInfo>
              <ActionButton 
                danger
                onClick={() => handleDeleteAsset(asset.id)}
              >
                Remove
              </ActionButton>
            </AssetItem>
          ))}
        </AssetsList>
      )}
      
      <ButtonContainer>
        <Button onClick={onBack}>
          Back
        </Button>
        
        <Button 
          primary 
          onClick={onContinue}
          disabled={createdAssets.length === 0}
        >
          Continue to Job Creation
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default AssetCreation;
