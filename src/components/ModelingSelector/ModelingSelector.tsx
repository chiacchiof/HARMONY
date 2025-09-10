import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ModelingSelector.css';

const ModelingSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="modeling-selector">
      <div className="selector-header">
        <h1>SHIFTAI</h1>
        <div className="selector-buttons">
          <button
            className={`selector-button ${location.pathname === '/fault-tree-editor' ? 'active' : ''}`}
            onClick={() => navigate('/fault-tree-editor')}
          >
            Fault Tree Editor
          </button>
          <button
            className={`selector-button ${location.pathname === '/markov-chain-editor' ? 'active' : ''}`}
            onClick={() => navigate('/markov-chain-editor')}
          >
            Markov Chain Editor
          </button>
        </div>
        <div className="logout-button">
          <button onClick={() => navigate('/')}>Logout</button>
        </div>
      </div>
    </div>
  );
};

export default ModelingSelector;