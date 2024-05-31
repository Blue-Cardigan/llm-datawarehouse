import React from 'react';

function Header({ username, onLogout, activeTab, handleTabChange }) {
  return (
    <header className="app-header">
      <div className="app-title">
        <img src="/vault-logo.png" alt="App Logo" className="logo" />
      </div>
      <nav className="header-navigation">
        <button className={`tab-button ${activeTab === 'search' ? 'active' : ''}`} onClick={() => handleTabChange('search')}>Search and Filter</button>
        <button className={`tab-button ${activeTab === 'llmQuery' ? 'active' : ''}`} onClick={() => handleTabChange('llmQuery')}>LLM Query</button>
        <button className={`tab-button ${activeTab === 'datasets' ? 'active' : ''}`} onClick={() => handleTabChange('datasets')}>View Datasets</button>
      </nav>
      <div className="user-info">
        <span className="username">{username || 'Login'}</span>
        <img src="/default-profile.png" alt="Profile" className="profile-image" />
        {username && <button onClick={onLogout}>Logout</button>}
      </div>
    </header>
  );
}

export default Header;