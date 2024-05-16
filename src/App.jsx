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
      <div className="tab-menu">
        <button 
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`} 
          onClick={() => setActiveTab('search')}
        >
          Search and Filter
        </button>
        <button 
          className={`tab-button ${activeTab === 'llmQuery' ? 'active' : ''}`} 
          onClick={() => setActiveTab('llmQuery')}
        >
          LLM Query
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
