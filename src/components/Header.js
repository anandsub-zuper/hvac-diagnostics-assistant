// src/components/Header.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  background-color: #3498db;
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  height: 70px;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
  display: flex;
  align-items: center;
`;

const LogoIcon = styled.span`
  margin-right: 10px;
  font-size: 1.8rem;
`;

const Nav = styled.nav`
  @media (max-width: 768px) {
    display: ${props => (props.isOpen ? 'flex' : 'none')};
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    background-color: #3498db;
    flex-direction: column;
    padding: 20px;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const NavItem = styled.li`
  margin-left: 20px;
  
  @media (max-width: 768px) {
    margin: 10px 0;
    text-align: center;
  }
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  ${props => props.active && `
    background-color: rgba(255, 255, 255, 0.2);
    font-weight: bold;
  `}
  
  @media (max-width: 768px) {
    display: block;
    padding: 12px;
  }
`;

const InstallButton = styled.button`
  background-color: white;
  color: #3498db;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    margin-top: 15px;
  }
`;

const InstallIcon = styled.span`
  margin-right: 8px;
`;

const MenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  margin-left: 15px;
  
  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 15px;
    justify-content: center;
  }
`;

const StatusDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => (props.isOnline ? '#2ecc71' : '#e74c3c')};
  margin-right: 6px;
`;

const Header = ({ isOnline }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  
  // Track if the app can be installed
  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleInstallClick = () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the saved prompt as it can't be used again
      setInstallPrompt(null);
    });
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">
          <LogoIcon>🔧</LogoIcon>
          HVAC Assistant
        </Logo>
        
        <MenuButton onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </MenuButton>
        
        <Nav isOpen={isMenuOpen}>
          <NavList>
            <NavItem>
              <NavLink to="/" active={location.pathname === '/' ? 1 : 0}>
                Diagnostics
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/saved" active={location.pathname === '/saved' ? 1 : 0}>
                Saved Reports
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/library" active={location.pathname === '/library' ? 1 : 0}>
                Reference Library
              </NavLink>
            </NavItem>
            
            <NavItem>
              <ConnectionStatus>
                <StatusDot isOnline={isOnline} />
                {isOnline ? 'Online' : 'Offline'}
              </ConnectionStatus>
            </NavItem>
            
            {installPrompt && (
              <NavItem>
                <InstallButton onClick={handleInstallClick}>
                  <InstallIcon>📱</InstallIcon>
                  Install App
                </InstallButton>
              </NavItem>
            )}
          </NavList>
        </Nav>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header;
