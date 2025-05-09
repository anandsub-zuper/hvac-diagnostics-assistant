// src/App.js
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import DiagnosticTool from './pages/DiagnosticTool';
import SavedDiagnostics from './pages/SavedDiagnostics';
import ReferenceLibrary from './pages/ReferenceLibrary';
import OfflinePage from './pages/OfflinePage';
import './App.css';

function App() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  
  // Add app-level state for data persistence
  const [diagnosticData, setDiagnosticData] = useState({
    step: 1,
    systemType: '',
    systemInfo: {},
    symptoms: ''
  });

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="app">
      <Header isOnline={isOnline} />
      <main>
        {!isOnline && (
          <div className="offline-banner">
            You are currently offline. Some features may be limited.
          </div>
        )}
        <Routes>
          <Route 
            path="/" 
            element={
              <DiagnosticTool 
                isOnline={isOnline} 
                diagnosticData={diagnosticData}
                setDiagnosticData={setDiagnosticData}
              />
            } 
          />
          <Route path="/saved" element={<SavedDiagnostics />} />
          <Route path="/library" element={<ReferenceLibrary />} />
          <Route path="/offline" element={<OfflinePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
