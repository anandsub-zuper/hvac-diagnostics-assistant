// src/pages/ReferenceLibrary.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getFromLocalStorage, saveToLocalStorage } from '../utils/storage';

const Container = styled.div`
  max-width: 1200px;
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

const CategoriesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 30px;
`;

const CategoryButton = styled.button`
  background-color: ${props => props.active ? '#3498db' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => props.active ? '#2980b9' : '#e5e5e5'};
  }
`;

const DocumentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const DocumentCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const DocumentIcon = styled.div`
  height: 120px;
  background-color: ${props => props.color || '#3498db'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
`;

const DocumentInfo = styled.div`
  padding: 15px;
`;

const DocumentTitle = styled.h3`
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 18px;
`;

const DocumentMeta = styled.div`
  font-size: 12px;
  color: #7f8c8d;
  display: flex;
  justify-content: space-between;
`;

const DownloadedBadge = styled.span`
  background-color: #2ecc71;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  margin-top: 5px;
  display: inline-block;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 40px;
`;

const EmptyStateTitle = styled.h3`
  margin-bottom: 10px;
  color: #2c3e50;
`;

const EmptyStateDescription = styled.p`
  color: #7f8c8d;
  margin-bottom: 20px;
`;

const NoInternetMessage = styled.div`
  background-color: #fff3cd;
  color: #856404;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
`;

const WarningIcon = styled.span`
  font-size: 24px;
  margin-right: 15px;
`;

// Sample reference documents data
const documents = [
  {
    id: 'doc-1',
    title: 'Central AC Troubleshooting Guide',
    type: 'guide',
    category: 'central-ac',
    icon: '❄️',
    color: '#3498db',
    dateAdded: '2024-12-10',
    size: '2.4 MB',
    downloaded: true,
    path: '/docs/central-ac-troubleshooting.pdf'
  },
  {
    id: 'doc-2',
    title: 'Heat Pump Maintenance Manual',
    type: 'manual',
    category: 'heat-pump',
    icon: '🔄',
    color: '#e74c3c',
    dateAdded: '2024-11-15',
    size: '3.8 MB',
    downloaded: true,
    path: '/docs/heat-pump-maintenance.pdf'
  },
  {
    id: 'doc-3',
    title: 'Furnace Safety Procedures',
    type: 'guide',
    category: 'furnace',
    icon: '🔥',
    color: '#f39c12',
    dateAdded: '2024-10-28',
    size: '1.7 MB',
    downloaded: true,
    path: '/docs/furnace-safety.pdf'
  },
  {
    id: 'doc-4',
    title: 'Refrigerant Handling Guidelines',
    type: 'guide',
    category: 'general',
    icon: '🧊',
    color: '#1abc9c',
    dateAdded: '2024-12-05',
    size: '5.2 MB',
    downloaded: false,
    path: '/docs/refrigerant-guidelines.pdf'
  },
  {
    id: 'doc-5',
    title: 'Ductless Mini-Split Installation',
    type: 'manual',
    category: 'mini-split',
    icon: '🔌',
    color: '#9b59b6',
    dateAdded: '2024-11-02',
    size: '8.1 MB',
    downloaded: false,
    path: '/docs/mini-split-installation.pdf'
  },
  {
    id: 'doc-6',
    title: 'Electrical Wiring Diagrams',
    type: 'reference',
    category: 'electrical',
    icon: '⚡',
    color: '#e67e22',
    dateAdded: '2024-12-18',
    size: '4.3 MB',
    downloaded: true,
    path: '/docs/electrical-diagrams.pdf'
  },
  {
    id: 'doc-7',
    title: 'Thermostat Programming Guide',
    type: 'guide',
    category: 'controls',
    icon: '🌡️',
    color: '#16a085',
    dateAdded: '2024-10-15',
    size: '1.2 MB',
    downloaded: true,
    path: '/docs/thermostat-programming.pdf'
  },
  {
    id: 'doc-8',
    title: 'R-410A Charging Calculator',
    type: 'tool',
    category: 'general',
    icon: '🧮',
    color: '#2980b9',
    dateAdded: '2024-11-30',
    size: '0.8 MB',
    downloaded: false,
    path: '/docs/r410a-calculator.pdf'
  }
];

const categories = [
  { id: 'all', name: 'All Documents' },
  { id: 'central-ac', name: 'Central AC' },
  { id: 'heat-pump', name: 'Heat Pumps' },
  { id: 'furnace', name: 'Furnaces' },
  { id: 'mini-split', name: 'Mini-Splits' },
  { id: 'general', name: 'General' },
  { id: 'electrical', name: 'Electrical' },
  { id: 'controls', name: 'Controls' }
];

const documentTypes = [
  { id: 'all-types', name: 'All Types' },
  { id: 'guide', name: 'Guides' },
  { id: 'manual', name: 'Manuals' },
  { id: 'reference', name: 'Reference' },
  { id: 'tool', name: 'Tools' }
];

const ReferenceLibrary = ({ isOnline = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('all-types');
  const [libraryDocuments, setLibraryDocuments] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  useEffect(() => {
    // In a real app, we would fetch documents from an API
    // For offline functionality, we're using the sample data
    setLibraryDocuments(documents);
    
    // Load recently viewed documents from localStorage
    const viewed = getFromLocalStorage('recentlyViewedDocs') || [];
    setRecentlyViewed(viewed);
  }, []);
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
  };
  
  const handleTypeClick = (typeId) => {
    setActiveType(typeId);
  };
  
  const handleDocumentClick = (document) => {
    // In a real app, this would open the document
    console.log(`Opening document: ${document.title}`);
    
    // Add to recently viewed (if not already there, move to top)
    const updatedRecentlyViewed = [
      document,
      ...recentlyViewed.filter(doc => doc.id !== document.id)
    ].slice(0, 5); // Keep only the 5 most recent
    
    setRecentlyViewed(updatedRecentlyViewed);
    saveToLocalStorage('recentlyViewedDocs', updatedRecentlyViewed);
    
    // If online and not downloaded, mark as downloaded
    if (isOnline && !document.downloaded) {
      const updatedDocuments = libraryDocuments.map(doc => 
        doc.id === document.id ? { ...doc, downloaded: true } : doc
      );
      setLibraryDocuments(updatedDocuments);
    }
    
    // In a real app, we would show a PDF viewer or download the file
    // For now, just simulate opening by alerting
    alert(`Opening ${document.title}. In a real app, this would open a PDF viewer.`);
  };
  
  // Filter documents based on search, category, and type
  const filteredDocuments = libraryDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesType = activeType === 'all-types' || doc.type === activeType;
    
    return matchesSearch && matchesCategory && matchesType;
  });
  
  // Filter for only downloaded documents when offline
  const availableDocuments = isOnline 
    ? filteredDocuments 
    : filteredDocuments.filter(doc => doc.downloaded);
  
  return (
    <Container>
      <Title>HVAC Reference Library</Title>
      
      {!isOnline && (
        <NoInternetMessage>
          <WarningIcon>⚠️</WarningIcon>
          <div>
            <strong>You're offline.</strong> Only previously downloaded documents are available. 
            Connect to the internet to access the full library.
          </div>
        </NoInternetMessage>
      )}
      
      <SearchContainer>
        <SearchInput 
          type="text" 
          placeholder="Search for manuals, guides, and references..." 
          value={searchQuery}
          onChange={handleSearch}
        />
      </SearchContainer>
      
      <h2>Categories</h2>
      <CategoriesContainer>
        {categories.map(category => (
          <CategoryButton 
            key={category.id}
            active={activeCategory === category.id}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </CategoryButton>
        ))}
      </CategoriesContainer>
      
      <h2>Document Types</h2>
      <CategoriesContainer>
        {documentTypes.map(type => (
          <CategoryButton 
            key={type.id}
            active={activeType === type.id}
            onClick={() => handleTypeClick(type.id)}
          >
            {type.name}
          </CategoryButton>
        ))}
      </CategoriesContainer>
      
      {recentlyViewed.length > 0 && (
        <>
          <h2>Recently Viewed</h2>
          <DocumentsGrid>
            {recentlyViewed.map(doc => (
              <DocumentCard key={`recent-${doc.id}`} onClick={() => handleDocumentClick(doc)}>
                <DocumentIcon color={doc.color}>{doc.icon}</DocumentIcon>
                <DocumentInfo>
                  <DocumentTitle>{doc.title}</DocumentTitle>
                  <DocumentMeta>
                    <span>{doc.type}</span>
                    <span>{doc.size}</span>
                  </DocumentMeta>
                  {doc.downloaded && <DownloadedBadge>Downloaded</DownloadedBadge>}
                </DocumentInfo>
              </DocumentCard>
            ))}
          </DocumentsGrid>
        </>
      )}
      
      <h2>Library Documents</h2>
      {availableDocuments.length > 0 ? (
        <DocumentsGrid>
          {availableDocuments.map(doc => (
            <DocumentCard key={doc.id} onClick={() => handleDocumentClick(doc)}>
              <DocumentIcon color={doc.color}>{doc.icon}</DocumentIcon>
              <DocumentInfo>
                <DocumentTitle>{doc.title}</DocumentTitle>
                <DocumentMeta>
                  <span>{doc.type}</span>
                  <span>{doc.size}</span>
                </DocumentMeta>
                {doc.downloaded && <DownloadedBadge>Downloaded</DownloadedBadge>}
              </DocumentInfo>
            </DocumentCard>
          ))}
        </DocumentsGrid>
      ) : (
        <EmptyState>
          <EmptyStateTitle>No documents found</EmptyStateTitle>
          <EmptyStateDescription>
            {isOnline 
              ? "Try adjusting your search or filters to find what you're looking for."
              : "You're offline and don't have any downloaded documents matching your criteria. Connect to the internet to access more resources."}
          </EmptyStateDescription>
        </EmptyState>
      )}
    </Container>
  );
};

export default ReferenceLibrary;
