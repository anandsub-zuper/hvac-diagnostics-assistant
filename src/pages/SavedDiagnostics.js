// src/pages/SavedDiagnostics.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getFromLocalStorage, removeFromLocalStorage } from '../utils/storage';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 20px;
`;

const SearchContainer = styled.div`
  margin-bottom: 30px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  &:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  background-color: ${props => props.active ? '#3498db' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: ${props => props.active ? '#2980b9' : '#e5e5e5'};
  }
`;

const DiagnosticsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 40px;
`;

const DiagnosticCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const DiagnosticHeader = styled.div`
  background-color: ${props => {
    switch (props.systemType) {
      case 'central-ac':
        return '#3498db';
      case 'heat-pump':
        return '#e74c3c';
      case 'furnace':
        return '#f39c12';
      case 'mini-split':
        return '#9b59b6';
      case 'boiler':
        return '#1abc9c';
      case 'package-unit':
        return '#2980b9';
      default:
        return '#34495e';
    }
  }};
  color: white;
  padding: 15px;
  position: relative;
`;

const SystemTypeLabel = styled.span`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
`;

const DiagnosticTitle = styled.h3`
  margin: 5px 0 0 0;
  font-size: 18px;
`;

const DateDisplay = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  font-size: 12px;
  opacity: 0.8;
`;

const DiagnosticContent = styled.div`
  padding: 15px;
`;

const SummaryLine = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Label = styled.span`
  font-weight: bold;
  min-width: 100px;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 15px;
`;

const Tag = styled.span`
  background-color: #f8f9fa;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #2c3e50;
`;

const OfflineTag = styled(Tag)`
  background-color: #95a5a6;
  color: white;
`;

const SeverityTag = styled(Tag)`
  background-color: ${props => {
    switch (props.severity) {
      case 'High':
        return 'rgba(231, 76, 60, 0.2)';
      case 'Medium':
        return 'rgba(243, 156, 18, 0.2)';
      case 'Low':
        return 'rgba(46, 204, 113, 0.2)';
      default:
        return '#f8f9fa';
    }
  }};
  color: ${props => {
    switch (props.severity) {
      case 'High':
        return '#c0392b';
      case 'Medium':
        return '#d35400';
      case 'Low':
        return '#27ae60';
      default:
        return '#2c3e50';
    }
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
`;

const Button = styled.button`
  background-color: ${props => props.primary ? '#3498db' : props.danger ? '#e74c3c' : '#f5f5f5'};
  color: ${props => (props.primary || props.danger) ? 'white' : '#333'};
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: ${props => 
      props.primary ? '#2980b9' : 
      props.danger ? '#c0392b' : 
      '#e5e5e5'
    };
  }
`;

const ButtonIcon = styled.span`
  margin-right: 5px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 40px;
`;

const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 15px;
  color: #7f8c8d;
`;

const EmptyStateTitle = styled.h3`
  margin-bottom: 10px;
  color: #2c3e50;
`;

const EmptyStateDescription = styled.p`
  color: #7f8c8d;
  margin-bottom: 20px;
`;

const SavedDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState([]);
  const [filteredDiagnostics, setFilteredDiagnostics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSystemType, setActiveSystemType] = useState('all');
  
  useEffect(() => {
    // Load saved diagnostics from localStorage
    loadSavedDiagnostics();
  }, []);
  
  useEffect(() => {
    // Filter diagnostics based on search query and active system type
    filterDiagnostics();
  }, [searchQuery, activeSystemType, diagnostics]);
  
  const loadSavedDiagnostics = () => {
    const saved = getFromLocalStorage('savedDiagnostics') || [];
    // Sort by timestamp (newest first)
    const sortedDiagnostics = saved.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    setDiagnostics(sortedDiagnostics);
  };
  
  const filterDiagnostics = () => {
    let filtered = [...diagnostics];
    
    // Filter by system type
    if (activeSystemType !== 'all') {
      filtered = filtered.filter(item => item.systemType === activeSystemType);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.symptoms && item.symptoms.toLowerCase().includes(query)) ||
        (item.result && 
          item.result.possibleIssues && 
          item.result.possibleIssues.some(issue => 
            issue.issue.toLowerCase().includes(query) || 
            (issue.description && issue.description.toLowerCase().includes(query))
          )
        )
      );
    }
    
    setFilteredDiagnostics(filtered);
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSystemTypeClick = (type) => {
    setActiveSystemType(type);
  };
  
  const handleDeleteDiagnostic = (id) => {
    if (window.confirm('Are you sure you want to delete this diagnostic report?')) {
      // Remove from state
      const updatedDiagnostics = diagnostics.filter(item => item.id !== id);
      setDiagnostics(updatedDiagnostics);
      
      // Update localStorage
      const savedDiagnostics = getFromLocalStorage('savedDiagnostics') || [];
      const updatedSaved = savedDiagnostics.filter(item => item.id !== id);
      removeFromLocalStorage('savedDiagnostics');
      localStorage.setItem('savedDiagnostics', JSON.stringify(updatedSaved));
    }
  };
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getSystemTypeName = (type) => {
    switch (type) {
      case 'central-ac':
        return 'Central AC';
      case 'heat-pump':
        return 'Heat Pump';
      case 'furnace':
        return 'Furnace';
      case 'mini-split':
        return 'Mini-Split';
      case 'boiler':
        return 'Boiler';
      case 'package-unit':
        return 'Package Unit';
      default:
        return 'Unknown';
    }
  };
  
  // Get a summary of the diagnostic for display
  const getDiagnosticSummary = (diagnostic) => {
    if (!diagnostic.result || !diagnostic.result.possibleIssues || diagnostic.result.possibleIssues.length === 0) {
      return "No issues identified";
    }
    
    // Get the highest severity issue
    const issuesBySerevity = [...diagnostic.result.possibleIssues].sort((a, b) => {
      const severityValue = {
        'High': 3,
        'Medium': 2,
        'Low': 1,
        'Unknown': 0
      };
      return severityValue[b.severity] - severityValue[a.severity];
    });
    
    const mainIssue = issuesBySerevity[0];
    
    return mainIssue.issue;
  };
  
  // System types for filter buttons
  const systemTypes = [
    { id: 'all', name: 'All Systems' },
    { id: 'central-ac', name: 'Central AC' },
    { id: 'heat-pump', name: 'Heat Pump' },
    { id: 'furnace', name: 'Furnace' },
    { id: 'mini-split', name: 'Mini-Split' },
    { id: 'boiler', name: 'Boiler' },
    { id: 'package-unit', name: 'Package Unit' }
  ];
  
  return (
    <Container>
      <Title>Saved Diagnostic Reports</Title>
      
      <SearchContainer>
        <SearchInput 
          type="text" 
          placeholder="Search by symptoms or issues..." 
          value={searchQuery}
          onChange={handleSearch}
        />
      </SearchContainer>
      
      <FilterContainer>
        {systemTypes.map(type => (
          <FilterButton 
            key={type.id}
            active={activeSystemType === type.id}
            onClick={() => handleSystemTypeClick(type.id)}
          >
            {type.name}
          </FilterButton>
        ))}
      </FilterContainer>
      
      {filteredDiagnostics.length > 0 ? (
        <DiagnosticsList>
          {filteredDiagnostics.map(diagnostic => (
            <DiagnosticCard key={diagnostic.id}>
              <DiagnosticHeader systemType={diagnostic.systemType}>
                <SystemTypeLabel>{getSystemTypeName(diagnostic.systemType)}</SystemTypeLabel>
                <DiagnosticTitle>{getDiagnosticSummary(diagnostic)}</DiagnosticTitle>
                <DateDisplay>
                  {formatDate(diagnostic.timestamp)} at {formatTime(diagnostic.timestamp)}
                </DateDisplay>
              </DiagnosticHeader>
              
              <DiagnosticContent>
                <SummaryLine>
                  <Label>Symptoms:</Label>
                  <span>{diagnostic.symptoms}</span>
                </SummaryLine>
                
                {diagnostic.systemInfo && diagnostic.systemInfo.brand && (
                  <SummaryLine>
                    <Label>System:</Label>
                    <span>
                      {diagnostic.systemInfo.brand} 
                      {diagnostic.systemInfo.model ? ` ${diagnostic.systemInfo.model}` : ''}
                      {diagnostic.systemInfo.age ? `, ${diagnostic.systemInfo.age} years old` : ''}
                    </span>
                  </SummaryLine>
                )}
                
                <TagsContainer>
                  {diagnostic.result && diagnostic.result.possibleIssues && 
                    diagnostic.result.possibleIssues.map((issue, index) => (
                      <SeverityTag key={index} severity={issue.severity}>
                        {issue.issue}
                      </SeverityTag>
                    ))
                  }
                  
                  {diagnostic.result && diagnostic.result.repairComplexity && (
                    <Tag>{diagnostic.result.repairComplexity} Repair</Tag>
                  )}
                  
                  {diagnostic.result && diagnostic.result.source && (
                    <OfflineTag>{diagnostic.result.source === 'cached' ? 'Cached' : 
                               diagnostic.result.source === 'predefined' ? 'Offline' : 
                               'Online'}</OfflineTag>
                  )}
                </TagsContainer>
                
                <ActionButtons>
                  <Button 
                    danger
                    onClick={() => handleDeleteDiagnostic(diagnostic.id)}
                  >
                    <ButtonIcon>🗑️</ButtonIcon>
                    Delete
                  </Button>
                  
                  <Link to={`/report/${diagnostic.id}`} style={{ textDecoration: 'none' }}>
                    <Button primary>
                      <ButtonIcon>👁️</ButtonIcon>
                      View Full Report
                    </Button>
                  </Link>
                </ActionButtons>
              </DiagnosticContent>
            </DiagnosticCard>
          ))}
        </DiagnosticsList>
      ) : (
        <EmptyState>
          <EmptyStateIcon>📋</EmptyStateIcon>
          <EmptyStateTitle>No diagnostic reports found</EmptyStateTitle>
          <EmptyStateDescription>
            {diagnostics.length > 0 
              ? "No reports match your current filters. Try adjusting your search criteria or system type filter."
              : "You haven't saved any diagnostic reports yet. Start a new diagnostic to create your first report."}
          </EmptyStateDescription>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Button primary>
              <ButtonIcon>+</ButtonIcon>
              Start New Diagnostic
            </Button>
          </Link>
        </EmptyState>
      )}
    </Container>
  );
};

export default SavedDiagnostics;
