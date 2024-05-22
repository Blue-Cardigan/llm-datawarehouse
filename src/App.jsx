import React, { useState, useEffect } from 'react';
import LlmQueryForm from './llmQueryForm';
import SearchAndFilter from './SearchAndFilter';
import Login from './login';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [tabSubtext, setTabSubtext] = useState('Find data manually by filtering datasets and geographies. Use if you already know exactly which data you\'re looking for.');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');  // Retrieve username from localStorage
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername);  // Set username if token is present
    }
  }, []);

  const setLoginState = (state, user = '') => {
    setIsLoggedIn(state);
    setUsername(user);
  };

  if (!isLoggedIn) {
    return <Login setLoginState={setLoginState} />;
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'search':
        setTabSubtext('Find data manually by filtering datasets and geographies. Use this to explore and download datasets.');
        break;
      case 'llmQuery':
        setTabSubtext('Ask more detailed questions across multiple datasets using LLM-based queries. Use this if you already know what data is available and want to find aggregations, totals etc.');
        break;
      case 'datasets':
        setTabSubtext('Explore and analyze datasets directly. Ideal for users who want to browse or visualize data without specific queries.');
        break;
      default:
        setTabSubtext('');
        break;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-title">
          <img src="/logo.png" alt="App Logo" className="logo" />
          <h1>Asylum Data Query Interface</h1>
        </div>
        <div className="user-info">
          <span className="username">{username || 'Login'}</span>
          <img src="/default-profile.png" alt="Profile" className="profile-image" />
        </div>
      </header>
      <nav className="secondary-header">
        <button className={`tab-button ${activeTab === 'search' ? 'active' : ''}`} onClick={() => handleTabChange('search')}>Search and Filter</button>
        <button className={`tab-button ${activeTab === 'llmQuery' ? 'active' : ''}`} onClick={() => handleTabChange('llmQuery')}>LLM Query</button>
        <button className={`tab-button ${activeTab === 'datasets' ? 'active' : ''}`} onClick={() => handleTabChange('datasets')}>View Datasets</button>
      </nav>
      <div className="tertiary-header">
        <p className="tab-subtext">{tabSubtext}</p>
      </div>
      <div className="content">
        {activeTab === 'search' && <SearchAndFilter />}
        {activeTab === 'llmQuery' && <LlmQueryForm setActiveTab={setActiveTab} />}
        {activeTab === 'datasets' && <div>Dataset Viewer Component Here</div>}
      </div>
    </div>
  );
}

export default App;