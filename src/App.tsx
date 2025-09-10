import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LLMProvider } from './contexts/LLMContext';
import MainPage from './components/MainPage/MainPage';
import FaultTreeEditor from './components/FaultTreeEditor/FaultTreeEditor';
import MarkovChainEditor from './components/MarkovChainEditor/MarkovChainEditor';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <LLMProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/fault-tree-editor" element={<FaultTreeEditor />} />
            <Route path="/markov-chain-editor" element={<MarkovChainEditor />} />
          </Routes>
        </Router>
      </LLMProvider>
    </div>
  );
};

export default App;
