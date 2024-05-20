import React, { useState, useEffect } from 'react';
import LlmQueryForm from './llmQueryForm';
import SearchAndFilter from './SearchAndFilter';
import Login from './login';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const setLoginState = (state) => {
    setIsLoggedIn(state);
  };

  if (!isLoggedIn) {
    return <Login setLoginState={setLoginState} />;
  }

  return (
    <div className="App">
      <h1>Asylum Data Query Interface</h1>
      <h4>Select a tab below to decide how you want to query data</h4>
      <div className="tab-menu">
        <button 
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`} 
          onClick={() => setActiveTab('search')}
        >
          <div>Search and Filter</div>
          <span className="tab-subtext">Find data manually by filtering datasets and geographies. Use if you already know exactly which data you're looking for.</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'llmQuery' ? 'active' : ''}`} 
          onClick={() => setActiveTab('llmQuery')}
        >
          <div>LLM Query</div>
          <span className="tab-subtext">Explore datasets using LLM-based queries. Use this method if you have a question and want to see what data is available.</span>
        </button>
      </div>
      {activeTab === 'search' ? (
        <>
          <SearchAndFilter />
        </>
      ) : (
        <>
          <LlmQueryForm setActiveTab={setActiveTab} />
        </>
      )}
    </div>
  );
}

export default App;
