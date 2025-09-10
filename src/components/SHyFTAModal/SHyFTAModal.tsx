import React, { useState, useEffect } from 'react';
import { FaultTreeModel } from '../../types/FaultTree';
import { SHyFTAService, SHyFTAConfig, SHyFTAProgress } from '../../services/shyfta-service';
import { SHyFTAConfig as SHyFTAConfigService, SHyFTASettings } from '../../config/shyfta-config';
import { MatlabResultsService } from '../../services/matlab-results-service';
import StopConfirmationModal from '../StopConfirmationModal/StopConfirmationModal';
import './SHyFTAModal.css';

interface SHyFTAModalProps {
  isOpen: boolean;
  onClose: () => void;
  faultTreeModel: FaultTreeModel;
  missionTime?: number;
}

const SHyFTAModal: React.FC<SHyFTAModalProps> = ({
  isOpen,
  onClose,
  faultTreeModel,
  missionTime = 500
}) => {
  // State for configuration
  const [shyftaLibFolder, setShyftaLibFolder] = useState('');
  const [iterations, setIterations] = useState(1000);
  const [confidence, setConfidence] = useState(0.95);
  const [confidenceToggle, setConfidenceToggle] = useState(true);
  const [resultsTimestep, setResultsTimestep] = useState(1.0);
  
  // State for simulation
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logOutput, setLogOutput] = useState('');
  
  // State for stop confirmation
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  
  // State for retrieve results loading
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Load saved configuration and setup progress callback
  useEffect(() => {
    if (isOpen) {
      // Load saved settings
      const savedSettings = SHyFTAConfigService.loadSettings();
      
      // Apply saved settings to state
      if (savedSettings.shyftaLibFolder) {
        setShyftaLibFolder(savedSettings.shyftaLibFolder);
      }
      setIterations(savedSettings.defaultIterations);
      setConfidence(savedSettings.defaultConfidence);
      setConfidenceToggle(savedSettings.defaultConfidenceToggle);
      setResultsTimestep(savedSettings.resultsTimestep);
      
      // Setup progress callback
      SHyFTAService.setProgressCallback((progressData: SHyFTAProgress) => {
        setProgress(progressData.progress);
        setCurrentStep(progressData.currentStep);
        setLogOutput(prev => prev + progressData.logOutput);
        setIsRunning(progressData.isRunning);
        setIsCompleted(progressData.isCompleted || false);
      });
    }
    
    return () => {
      // Cleanup on unmount
      SHyFTAService.setProgressCallback(() => {});
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectFolder = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        
        // Imposta solo il nome della cartella
        setShyftaLibFolder(dirHandle.name);
        
        // Save to persistent config
        SHyFTAConfigService.updateSetting('shyftaLibFolder', dirHandle.name);
        
      } else {
        // Fallback: ask user to input folder name manually
        const folderName = prompt('Inserisci il nome della cartella SHyFTALib:\n(esempio: SHyFTALib)');
        if (folderName && folderName.trim()) {
          setShyftaLibFolder(folderName.trim());
          SHyFTAConfigService.updateSetting('shyftaLibFolder', folderName.trim());
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const buildConfig = (): SHyFTAConfig => ({
    shyftaLibFolder,
    modelName: 'ZFTATree.m',
    iterations,
    confidence,
    confidenceToggle,
    missionTime
  });


  const handleRunSimulation = async () => {
    const config = buildConfig();
    
    // Save current settings before running
    const currentSettings: SHyFTASettings = {
      shyftaLibFolder,
      defaultIterations: iterations,
      defaultConfidence: confidence,
      defaultConfidenceToggle: confidenceToggle,
      lastUsedModelName: 'ZFTATree.m',
      resultsTimestep,
    };
    SHyFTAConfigService.saveSettings(currentSettings);
    
    // Reset progress state
    setIsRunning(true);
    setIsCompleted(false);
    setProgress(0);
    setLogOutput('');
    setCurrentStep('Inizializzazione...');

    try {
      await SHyFTAService.runSimulation(faultTreeModel, config);
      // Non mostrare più l'alert automatico, lasciare che l'utente gestisca la chiusura tramite il log
    } catch (error) {
      alert(`Errore durante la simulazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopRequest = () => {
    setShowStopConfirmation(true);
  };

  const handleConfirmStop = async () => {
    await SHyFTAService.stopSimulation();
    setShowStopConfirmation(false);
  };

  // Debug function to test results loading  
  const handleTestResultsLoading = async () => {
    console.log('🧪 [DEBUG] Testing results loading manually...');
    
    // Set loading state
    setIsLoadingResults(true);
    
    // Test with your actual results.mat path
    const testPath = 'C:/SHyFTOO/output/results.mat';
    console.log(`📁 Testing with path: ${testPath}`);
    
    try {
      const success = await MatlabResultsService.loadResultsAfterSimulation(
        'C:/SHyFTOO', // Use your actual SHyFTA path
        faultTreeModel.events,
        faultTreeModel.gates,
        missionTime,
        iterations,
        {
          timestep: resultsTimestep
        }
      );
      
      if (success) {
        alert('✅ Real results loaded from results.mat! Check console and components for actual data.');
      } else {
        alert('❌ Failed to load results - check console for details.');
      }
    } catch (error) {
      console.error('Error during test:', error);
      alert(`❌ Error: ${error}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResetSimulation = () => {
    SHyFTAService.resetSimulation();
    setProgress(0);
    setCurrentStep('');
    setLogOutput('');
  };

  return (
    <div className="shyfta-modal-overlay" onClick={onClose}>
      <div className="shyfta-modal" onClick={e => e.stopPropagation()}>
        <div className="shyfta-modal-header">
          <h2>🔬 SHyFTA Simulation</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="shyfta-modal-content">
          {/* Configuration Section */}
          <div className="config-section">
            <h3>⚙️ Configurazione</h3>
            
            <div className="form-group">
              <label>📁 Cartella SHyFTALib:</label>
              <div className="folder-input">
                <input
                  type="text"
                  value={shyftaLibFolder}
                  onChange={(e) => {
                    setShyftaLibFolder(e.target.value);
                    SHyFTAConfigService.updateSetting('shyftaLibFolder', e.target.value);
                  }}
                  placeholder="SHyFTALib"
                  disabled={isRunning}
                  className="folder-name-input"
                />
                
              </div>
              
              <small className="folder-help">
                💡 Inserisci il path assoluto della cartella SHyFTALib <br/>
              </small>
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
          </div>

          {/* Simulation Progress Section */}
          {(isRunning || isCompleted) && (
            <div className="progress-section">
              <h3>{isRunning ? '🔄 Simulazione Automatica in Corso' : '✅ Simulazione Completata'}</h3>
              
              <div className="progress-info">
                <div className="current-step">{isCompleted ? 'Simulazione completata con successo!' : currentStep}</div>
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
                  placeholder="I log della simulazione appariranno qui..."
                />
              </div>
            </div>
          )}

          {/* Results Analysis Configuration */}
          <div className="config-section">
            <h3>📊 Configurazione Analisi Risultati</h3>
            <div className="form-row">
              <div className="form-group">
                <label>⏱️ Timestep Analisi:</label>
                <input
                  type="number"
                  value={resultsTimestep}
                  onChange={(e) => setResultsTimestep(Number(e.target.value))}
                  min="0.01"
                  step="0.1"
                  disabled={isRunning}
                />
                <small className="help-text">
                  Delta temporale per calcoli PDF/CDF (ore)
                </small>
              </div>

            </div>
          </div>

          {/* Model Info */}
          <div className="model-info">
            <h3>📋 Informazioni Modello</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Eventi Base:</span>
                <span className="info-value">{faultTreeModel.events.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Porte:</span>
                <span className="info-value">{faultTreeModel.gates.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Connessioni:</span>
                <span className="info-value">{faultTreeModel.connections.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mission Time:</span>
                <span className="info-value">{missionTime}h</span>
              </div>
            </div>
          </div>
        </div>

        <div className="shyfta-modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isRunning}
          >
            {isRunning ? 'Chiudi quando completato' : 'Chiudi'}
          </button>
          
          {/* Debug button to test results loading */}
          {!isRunning && (
            <button 
              className="test-button"
              onClick={handleTestResultsLoading}
              title="Test caricamento risultati (usa dati mock)"
              disabled={isLoadingResults}
            >
              {isLoadingResults ? (
                <span>⏳ Loading...</span>
              ) : (
                <span>🔍 Retrieve Results</span>
              )}
            </button>
          )}
          
          {!isRunning && !isCompleted && (
            <button 
              className="run-button primary" 
              onClick={handleRunSimulation}
              disabled={!shyftaLibFolder}
            >
              🚀 Run SHyFTA
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
                handleRunSimulation();
              }}
              disabled={!shyftaLibFolder}
            >
              🔄 Esegui Nuovamente
            </button>
          )}
          
          {isRunning && (
            <button 
              className="stop-button" 
              onClick={handleStopRequest}
            >
              ⏹️ Ferma Simulazione
            </button>
          )}
        </div>

        {/* Stop Confirmation Modal */}
        <StopConfirmationModal
          isOpen={showStopConfirmation}
          onClose={() => setShowStopConfirmation(false)}
          onConfirm={handleConfirmStop}
          simulationProgress={progress}
        />
      </div>
    </div>
  );
};

export default SHyFTAModal;