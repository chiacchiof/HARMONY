import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just navigate without actual authentication
    navigate('/fault-tree-editor');
  };

  return (
    <div className="main-page">
      <div className="login-container">
        <div className="login-form">
          <img src="/assets/LogoHarmony.png" alt="HARMONY Logo" className="harmony-logo" />
          <h1>HARMONY</h1>
          <h2>Hybrid Availability and Reliability MOdelliNg sYstems</h2>
          <h3>Dynamic Hybrid Fault Tree & Markov Chain</h3>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
          
          <div className="modeling-options">
            <h3>Available Modeling Tools:</h3>
            <div className="tool-cards">
              <div className="tool-card">
                <h4>Fault Tree Editor</h4>
                <p>Create and analyze dynamic fault trees with static and dynamic gates</p>
              </div>
              <div className="tool-card">
                <h4>Markov Chain Editor</h4>
                <p>Model and analyze Markov chains with states and transitions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;