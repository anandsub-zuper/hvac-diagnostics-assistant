// src/components/Footer.js
import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  background-color: #34495e;
  color: white;
  padding: 20px;
  text-align: center;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Copyright = styled.p`
  margin: 0;
  font-size: 0.9rem;
`;

const FooterLinks = styled.div`
  margin: 15px 0;
  display: flex;
  gap: 20px;
`;

const FooterLink = styled.a`
  color: white;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const AppVersion = styled.p`
  font-size: 0.8rem;
  margin: 5px 0 0 0;
  color: #bdc3c7;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterLinks>
          <FooterLink href="/about">About</FooterLink>
          <FooterLink href="/privacy">Privacy Policy</FooterLink>
          <FooterLink href="/terms">Terms of Use</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </FooterLinks>
        
        <Copyright>
          &copy; {new Date().getFullYear()} HVAC System Diagnostics Assistant. All rights reserved.
        </Copyright>
        
        <AppVersion>Version 1.0.0</AppVersion>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
