import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {  // Change setLoginState to onLogin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', username);  // Store username in localStorage
      onLogin(username);  // Call onLogin with the username
    } catch (error) {
      alert('Invalid username or password');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>
      <div>
        <label>Username:</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div>
        <label>Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;