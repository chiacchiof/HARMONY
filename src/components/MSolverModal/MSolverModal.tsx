import React, { useState, useEffect } from 'react';
import { MarkovChainModel } from '../../types/MarkovChain';
import './MSolverModal.css';

interface MSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  markovChainModel: MarkovChainModel;
}

const MSolverModal: React.FC<MSolverModalProps> = ({
  isOpen,
  onClose,
  markovChainModel
}) => {
  // State for configuration
  const [libraryDirectory, setLibraryDirectory] = useState('');
  const [timeT, setTimeT] = useState(100);
  const [deltaT, setDeltaT] = useState(0.1);
  const [iterations, setIterations] = useState(1000);
  const [confidence, setConfidence] = useState(0.95);
  const [confidenceToggle, setConfidenceToggle] = useState(true);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  
  // State for simulation
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logOutput, setLogOutput] = useState('');

  // Load saved configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load saved settings from localStorage or config service
      const savedLibraryDir = localStorage.getItem('msolver-library-directory');
      if (savedLibraryDir) {
        setLibraryDirectory(savedLibraryDir);
      }
      
      // Reset simulation state when opening
      setIsRunning(false);
      setIsCompleted(false);
      setProgress(0);
      setCurrentStep('');
      setLogOutput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectDirectory = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        setLibraryDirectory(dirHandle.name);
        localStorage.setItem('msolver-library-directory', dirHandle.name);
      } else {
        // Fallback: ask user to input directory path manually
        const dirPath = prompt('Inserisci il path della directory della libreria:\n(esempio: C:\\MSolver\\lib)');
        if (dirPath && dirPath.trim()) {
          setLibraryDirectory(dirPath.trim());
          localStorage.setItem('msolver-library-directory', dirPath.trim());
        }
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handleRunCTMC = async () => {
    // Reset progress state
    setIsRunning(true);
    setIsCompleted(false);
    setProgress(0);
    setLogOutput('');
    setCurrentStep('Inizializzazione CTMC...');

    try {
      // Simulate CTMC execution - this would be replaced with actual backend call
      setCurrentStep('Preparazione modello Markov...');
      setProgress(20);
      setLogOutput(prev => prev + 'Modello Markov caricato\n');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('Configurazione parametri di simulazione...');
      setProgress(40);
      setLogOutput(prev => prev + `Parametri configurati: t=${timeT}, Δt=${deltaT}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('Esecuzione analisi CTMC...');
      setProgress(70);
      setLogOutput(prev => prev + 'Analisi CTMC in corso...\n');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentStep('Finalizzazione risultati...');
      setProgress(100);
      setLogOutput(prev => prev + 'Simulazione CTMC completata con successo!\n');
      
      setIsCompleted(true);
    } catch (error) {
      alert(`Errore durante l'analisi CTMC: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopSimulation = () => {
    setIsRunning(false);
    setCurrentStep('Simulazione interrotta');
    setLogOutput(prev => prev + 'Simulazione interrotta dall\'utente\n');
  };

  return (
    <div className="msolver-modal-overlay" onClick={onClose}>
      <div className="msolver-modal" onClick={e => e.stopPropagation()}>
        <div className="msolver-modal-header">
          <h2>🔬 MSolver - CTMC Analysis</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="msolver-modal-content">
          {/* Configuration Section */}
          <div className="config-section">
            <h3>⚙️ Configurazione</h3>
            
            <div className="form-group">
              <label>📁 Directory Libreria:</label>
              <div className="folder-input">
                <input
                  type="text"
                  value={libraryDirectory}
                  onChange={(e) => {
                    setLibraryDirectory(e.target.value);
                    localStorage.setItem('msolver-library-directory', e.target.value);
                  }}
                  placeholder="C:\MSolver\lib"
                  disabled={isRunning}
                  className="folder-name-input"
                />
                <button 
                  className="select-folder-button"
                  onClick={handleSelectDirectory}
                  disabled={isRunning}
                >
                  📂 Seleziona
                </button>
              </div>
              <small className="folder-help">
                💡 Inserisci il path assoluto della directory della libreria MSolver
              </small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>⏰ Tempo t:</label>
                <input
                  type="number"
                  value={timeT}
                  onChange={(e) => setTimeT(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>

              <div className="form-group">
                <label>⏱️ Delta t:</label>
                <input
                  type="number"
                  value={deltaT}
                  onChange={(e) => setDeltaT(Number(e.target.value))}
                  min="0.01"
                  step="0.01"
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>🔄 Iterazioni:</label>
                <input
                  type="number"
                  value={iterations}
                  onChange={(e) => setIterations(Number(e.target.value))}
                  min="1"
                  disabled={isRunning}
                />
              </div>

              <div className="form-group">
                <label>📊 Intervallo di Confidenza:</label>
                <div className="confidence-input">
                  <input
                    type="number"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    disabled={isRunning}
                  />
                  <div className="toggle-group">
                    <span className="toggle-label">Stop Criteria:</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={confidenceToggle}
                        onChange={(e) => setConfidenceToggle(e.target.checked)}
                        disabled={isRunning}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-status">
                      {confidenceToggle ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="simulation-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={simulationEnabled}
                    onChange={(e) => setSimulationEnabled(e.target.checked)}
                    disabled={isRunning}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">Abilita Simulazione</span>
                <span className="toggle-status">
                  {simulationEnabled ? 'ABILITATA' : 'DISABILITATA'}
                </span>
              </div>
            </div>
          </div>

          {/* Simulation Progress Section */}
          {(isRunning || isCompleted) && (
            <div className="progress-section">
              <h3>{isRunning ? '🔄 Analisi CTMC in Corso' : '✅ Analisi CTMC Completata'}</h3>
              
              <div className="progress-info">
                <div className="current-step">{isCompleted ? 'Analisi completata con successo!' : currentStep}</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <span className="progress-text">{progress.toFixed(1)}%</span>
                </div>
              </div>

              <div className="log-output">
                <div className="log-header">
                  <h4>📝 Output Log:</h4>
                  {isCompleted && (
                    <button 
                      className="close-log-button"
                      onClick={() => {
                        setIsCompleted(false);
                        setProgress(0);
                        setCurrentStep('');
                        setLogOutput('');
                      }}
                    >
                      ✖️ Chiudi Log
                    </button>
                  )}
                </div>
                <textarea
                  value={logOutput}
                  readOnly
                  rows={6}
                  placeholder="I log dell'analisi CTMC appariranno qui..."
                />
              </div>
            </div>
          )}

          {/* Model Info */}
          <div className="model-info">
            <h3>📋 Informazioni Modello Markov</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Stati:</span>
                <span className="info-value">{markovChainModel.states.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Transizioni:</span>
                <span className="info-value">{markovChainModel.transitions.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tempo t:</span>
                <span className="info-value">{timeT}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Delta t:</span>
                <span className="info-value">{deltaT}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="msolver-modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isRunning}
          >
            {isRunning ? 'Chiudi quando completato' : 'Chiudi'}
          </button>
          
          {!isRunning && !isCompleted && (
            <button 
              className="run-button primary" 
              onClick={handleRunCTMC}
              disabled={!libraryDirectory}
            >
              🚀 RUN CTMC
            </button>
          )}
          
          {!isRunning && isCompleted && (
            <button 
              className="run-button primary" 
              onClick={() => {
                setIsCompleted(false);
                setProgress(0);
                setCurrentStep('');
                setLogOutput('');
                handleRunCTMC();
              }}
              disabled={!libraryDirectory}
            >
              🔄 Esegui Nuovamente
            </button>
          )}
          
          {isRunning && (
            <button 
              className="stop-button" 
              onClick={handleStopSimulation}
            >
              ⏹️ Ferma Analisi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MSolverModal;