// App.js
import React, { useState, useEffect } from 'react';
import LlmQueryForm from './llmQueryForm';
import SearchAndFilter from './SearchAndFilter';
import Login from './login';
import Header from './Header';
import DatasetViewer from './DatasetViewer';
import HistoricElectionResults from './HistoricElectionResults';

const tabSubtexts = {
  search: 'Find datasets, select locations, and download data.',
  llmQuery: 'Ask detailed questions across multiple datasets using LLM-based queries.',
  datasets: 'Explore and analyze datasets directly.',
  electionResults: 'View historic election results by year, party, and constituency.',
};

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [tabSubtext, setTabSubtext] = useState(tabSubtexts.search);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTabSubtext(tabSubtexts[tab] || '');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <Header 
        username={username} 
        onLogout={handleLogout} 
        activeTab={activeTab}
        handleTabChange={handleTabChange}
      />

      <div className="tertiary-header">
        <p className="tab-subtext">{tabSubtext}</p>
      </div>
      <div className="content">
        {activeTab === 'search' && <SearchAndFilter />}
        {activeTab === 'llmQuery' && <LlmQueryForm setActiveTab={setActiveTab} />}
        {activeTab === 'datasets' && <DatasetViewer />}
        {activeTab === 'electionResults' && <HistoricElectionResults />}
      </div>
    </div>
  );
}

export default App;