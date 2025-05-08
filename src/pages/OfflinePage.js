// src/pages/OfflinePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const OfflineIcon = styled.div`
  font-size: 72px;
  margin: 30px 0;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 20px;
`;

const Description = styled.p`
  font-size: 18px;
  color: #7f8c8d;
  margin-bottom: 30px;
  max-width: 600px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 30px;
  width: 100%;
  max-width: 600px;
`;

const CardTitle = styled.h2`
  color: #3498db;
  margin-bottom: 15px;
`;

const List = styled.ul`
  text-align: left;
  padding-left: 20px;
`;

const ListItem = styled.li`
  margin-bottom: 10px;
`;

const Button = styled(Link)`
  background-color: #3498db;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  margin: 10px;
  
  &:hover {
    background-color: #2980b9;
  }
`;

const OfflinePage = () => {
  return (
    <Container>
      <OfflineIcon>📶</OfflineIcon>
      <Title>You're Working Offline</Title>
      <Description>
        No worries! The HVAC System Diagnostics Assistant is designed to work offline. 
        Here's what you can still do without an internet connection:
      </Description>
      
      <Card>
        <CardTitle>Available Offline Features</CardTitle>
        <List>
          <ListItem>
            <strong>Access saved diagnostics</strong> - View all previously saved diagnostic reports
          </ListItem>
          <ListItem>
            <strong>Basic diagnostics</strong> - Get diagnostic suggestions based on common HVAC issues
          </ListItem>
          <ListItem>
            <strong>Reference library</strong> - Access cached troubleshooting guides and manuals
          </ListItem>
          <ListItem>
            <strong>Create new reports</strong> - Generate new diagnostic reports (with limited AI assistance)
          </ListItem>
        </List>
      </Card>
      
      <Card>
        <CardTitle>Limitations While Offline</CardTitle>
        <List>
          <ListItem>
            <strong>Advanced AI diagnostics</strong> - Full AI-powered analysis requires an internet connection
          </ListItem>
          <ListItem>
            <strong>Uncached resources</strong> - Any resources not previously viewed will be unavailable
          </ListItem>
          <ListItem>
            <strong>Syncing</strong> - New reports will be stored locally and synced when you're back online
          </ListItem>
        </List>
      </Card>
      
      <div>
        <Button to="/">Start New Diagnostic</Button>
        <Button to="/saved">View Saved Diagnostics</Button>
      </div>
    </Container>
  );
};

export default OfflinePage;
