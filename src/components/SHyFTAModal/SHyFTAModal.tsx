import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
  onShowCIResults?: () => void; // Callback per mostrare i risultati CI
}

// Memoized log textarea component to prevent unnecessary re-renders
const LogTextarea = memo(({ value, placeholder }: { value: string; placeholder: string }) => (
  <textarea
    value={value}
    readOnly
    rows={6}
    placeholder={placeholder}
    style={{ fontFamily: 'monospace', fontSize: '12px' }}
  />
));

// Memoized progress bar component
const ProgressBar = memo(({ progress }: { progress: number }) => (
  <div className="progress-bar">
    <div 
      className="progress-fill" 
      style={{ width: `${progress}%` }}
    ></div>
    <span className="progress-text">{progress.toFixed(1)}%</span>
  </div>
));

const SHyFTAModal: React.FC<SHyFTAModalProps> = ({
  isOpen,
  onClose,
  faultTreeModel,
  missionTime = 500,
  onShowCIResults
}) => {
  // Enhanced close function with cleanup
  const handleClose = () => {
    // Clear any pending timeouts
    if (progressUpdateTimeout.current) {
      clearTimeout(progressUpdateTimeout.current);
      progressUpdateTimeout.current = null;
    }
    // Clear progress callback and reset state to prevent memory leaks
    SHyFTAService.resetSimulation();
    console.log('🧹 [SHyFTAModal] Cleanup on close - reset simulation state');
    onClose();
  };
  // State for configuration
  const [shyftaLibFolder, setShyftaLibFolder] = useState('');
  const [iterations, setIterations] = useState(1000);
  const [confidence, setConfidence] = useState(0.95);
  const [confidenceToggle, setConfidenceToggle] = useState(true);
  const [resultsTimestep, setResultsTimestep] = useState(1.0);
  
  // Advanced simulation parameters
  const [percentageErrorTollerance, setPercentageErrorTollerance] = useState(5.0);
  const [minIterationsForCI, setMinIterationsForCI] = useState(1000);
  const [maxIterationsForRobustness, setMaxIterationsForRobustness] = useState(1000000);
  const [stabilityCheckWindow, setStabilityCheckWindow] = useState(50);
  const [stabilityThreshold, setStabilityThreshold] = useState(0.1);
  const [convergenceCheckWindow, setConvergenceCheckWindow] = useState(20);
  const [convergenceThreshold, setConvergenceThreshold] = useState(0.15);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
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
  const [resultsLoaded, setResultsLoaded] = useState(false);
  
  // State per tracciare se il modello è cambiato dall'ultima simulazione
  const [modelChangedSinceLastRun, setModelChangedSinceLastRun] = useState(false);
  const [lastSimulatedModel, setLastSimulatedModel] = useState<string | null>(null);
  const [hasSimulationResults, setHasSimulationResults] = useState(false);

  // Refs for performance optimization
  const lastUpdateTime = useRef(0);
  const logBuffer = useRef('');
  const progressUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Throttled progress update function
  const throttledProgressUpdate = useCallback((progressData: SHyFTAProgress) => {
    const now = Date.now();

    // Always update progress and running state immediately
    setProgress(progressData.progress);
    setIsRunning(progressData.isRunning);
    setCurrentStep(progressData.currentStep);

    // Handle completion immediately - unified logic for both completion conditions
    const wasCompleted = progressData.isCompleted || false;
    const simulationFinished = wasCompleted || (progressData.progress >= 100 && !progressData.isRunning);

    if (simulationFinished && !progressData.isRunning) {
      setIsCompleted(true);

      const currentModelHash = JSON.stringify({
        events: faultTreeModel.events.length,
        gates: faultTreeModel.gates.length,
        connections: faultTreeModel.connections.length,
        eventsHash: faultTreeModel.events.map(e => e.id + e.name).join(''),
        gatesHash: faultTreeModel.gates.map(g => g.id + g.name).join('')
      });

      setLastSimulatedModel(currentModelHash);
      setModelChangedSinceLastRun(false);
      setHasSimulationResults(true);

      console.log('✅ [SHyFTAModal] Simulation completed - model hash saved, retrieve results enabled');
    }
    
    // Throttle log updates to max 2 per second
    if (progressData.logOutput) {
      logBuffer.current += progressData.logOutput;
      
      if (now - lastUpdateTime.current > 500) { // Update logs max every 500ms
        const currentLogs = logBuffer.current;
        logBuffer.current = '';
        lastUpdateTime.current = now;
        
        setLogOutput(prev => {
          const newLogs = prev + currentLogs;
          // Keep only last 10000 characters to prevent memory issues
          return newLogs.length > 10000 ? newLogs.slice(-8000) : newLogs;
        });
      } else {
        // Schedule an update if one isn't already scheduled
        if (!progressUpdateTimeout.current) {
          progressUpdateTimeout.current = setTimeout(() => {
            const currentLogs = logBuffer.current;
            logBuffer.current = '';
            lastUpdateTime.current = Date.now();
            progressUpdateTimeout.current = null;
            
            setLogOutput(prev => {
              const newLogs = prev + currentLogs;
              // Keep only last 10000 characters to prevent memory issues
              return newLogs.length > 10000 ? newLogs.slice(-8000) : newLogs;
            });
          }, 500);
        }
      }
    }
  }, [faultTreeModel]);

  // Effetto per tracciare cambiamenti del modello
  useEffect(() => {
    const currentModelHash = JSON.stringify({
      events: faultTreeModel.events.length,
      gates: faultTreeModel.gates.length,
      connections: faultTreeModel.connections.length,
      eventsHash: faultTreeModel.events.map(e => e.id + e.name).join(''),
      gatesHash: faultTreeModel.gates.map(g => g.id + g.name).join('')
    });
    
    if (lastSimulatedModel && lastSimulatedModel !== currentModelHash) {
      console.log('🔄 [SHyFTAModal] Model changed since last simulation - disabling retrieve results');
      setModelChangedSinceLastRun(true);
      setResultsLoaded(false); // Reset results loaded state when model changes
      setHasSimulationResults(false); // Reset results availability when model changes
    }
  }, [faultTreeModel.events, faultTreeModel.gates, faultTreeModel.connections, lastSimulatedModel]);

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
      
      // Load advanced settings if available
      if (savedSettings.percentageErrorTollerance !== undefined) {
        setPercentageErrorTollerance(savedSettings.percentageErrorTollerance);
      }
      if (savedSettings.minIterationsForCI !== undefined) {
        setMinIterationsForCI(savedSettings.minIterationsForCI);
      }
      if (savedSettings.maxIterationsForRobustness !== undefined) {
        setMaxIterationsForRobustness(savedSettings.maxIterationsForRobustness);
      }
      if (savedSettings.stabilityCheckWindow !== undefined) {
        setStabilityCheckWindow(savedSettings.stabilityCheckWindow);
      }
      if (savedSettings.stabilityThreshold !== undefined) {
        setStabilityThreshold(savedSettings.stabilityThreshold);
      }
      if (savedSettings.convergenceCheckWindow !== undefined) {
        setConvergenceCheckWindow(savedSettings.convergenceCheckWindow);
      }
      if (savedSettings.convergenceThreshold !== undefined) {
        setConvergenceThreshold(savedSettings.convergenceThreshold);
      }
      
      // Setup progress callback with throttling
      SHyFTAService.setProgressCallback(throttledProgressUpdate);
    }
    
    return () => {
      // Cleanup on unmount - clear callback completely and reset state
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
        progressUpdateTimeout.current = null;
      }
      SHyFTAService.resetSimulation();
      console.log('🧹 [SHyFTAModal] Cleaned up progress callback and reset simulation state');
    };
  }, [isOpen, throttledProgressUpdate]);

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
    missionTime,
    percentageErrorTollerance,
    minIterationsForCI,
    maxIterationsForRobustness,
    stabilityCheckWindow,
    stabilityThreshold,
    convergenceCheckWindow,
    convergenceThreshold
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
      percentageErrorTollerance,
      minIterationsForCI,
      maxIterationsForRobustness,
      stabilityCheckWindow,
      stabilityThreshold,
      convergenceCheckWindow,
      convergenceThreshold,
    };
    SHyFTAConfigService.saveSettings(currentSettings);
    
    // Reset progress state
    setIsRunning(true);
    setIsCompleted(false);
    setProgress(0);
    setLogOutput('');
    setCurrentStep('Inizializzazione...');
    
    // Reset model change tracking and results availability (la nuova simulazione renderà i risultati validi)
    setModelChangedSinceLastRun(false);
    setResultsLoaded(false); // Reset results loaded state when starting new simulation
    setHasSimulationResults(false);

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
        setResultsLoaded(true);
        alert('✅ Real results loaded from results.mat! Check console and components for actual data.');
      } else {
        setResultsLoaded(false);
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
    <div className="shyfta-modal-overlay" onClick={handleClose}>
      <div className="shyfta-modal" onClick={e => e.stopPropagation()}>
        <div className="shyfta-modal-header">
          <h2>🔬 SHyFTA Simulation</h2>
          <button className="close-button" onClick={handleClose}>×</button>
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
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setIterations(1); // Default minimo
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue >= 1) {
                        setIterations(numValue);
                        SHyFTAConfigService.updateSetting('defaultIterations', numValue);
                      }
                    }
                  }}
                  min="1"
                  disabled={isRunning}
                />
              </div>
              <div className="form-group">
                <label>Approssima con Intervallo di Confidenza</label>
                <div className="toggle-group">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={confidenceToggle}
                      onChange={(e) => {
                        setConfidenceToggle(e.target.checked);
                        SHyFTAConfigService.updateSetting('defaultConfidenceToggle', e.target.checked);
                      }}
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

            <div className="form-row">
              <div className="form-group">
                <label>📊 Intervallo di Confidenza:</label>
                <input
                  type="number"
                  value={confidence}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setConfidence(0.01); // Default minimo
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue >= 0.01 && numValue <= 0.99) {
                        setConfidence(numValue);
                        SHyFTAConfigService.updateSetting('defaultConfidence', numValue);
                      }
                    }
                  }}
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  disabled={isRunning || !confidenceToggle}
                />
              </div>
              <div className="form-group">
                <label>📊 Tolleranza Errore Percentuale:</label>
                <input
                  type="number"
                  value={percentageErrorTollerance}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setPercentageErrorTollerance(0.1); // Default minimo
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 99.9) {
                        setPercentageErrorTollerance(numValue);
                        SHyFTAConfigService.updateSetting('percentageErrorTollerance', numValue/100);
                      }
                    }
                  }}
                  min="0.1"
                  max="99.9"
                  step="0.1"
                  disabled={isRunning || !confidenceToggle}
                />
                <small className="help-text">%</small>
              </div>
            </div>
          </div>

          {/* Advanced Simulation Configuration */}
          <div className="config-section">
            <h3 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="collapsible-header"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>{showAdvancedSettings ? '▼' : '▶'}</span>
              ⚙️ Simulazione Avanzata
            </h3>
            
            {showAdvancedSettings && (
              <div className="advanced-settings">
                <div className="form-row">
                  <div className="form-group">
                    <label>🔄 Min Iterazioni per CI:</label>
                    <input
                      type="number"
                      value={minIterationsForCI}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setMinIterationsForCI(100); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 100) {
                            setMinIterationsForCI(numValue);
                            SHyFTAConfigService.updateSetting('minIterationsForCI', numValue);
                          }
                        }
                      }}
                      min="100"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Iterazioni minime prima controlli CI</small>
                  </div>

                  <div className="form-group">
                    <label>🛑 Max Iterazioni Robustezza:</label>
                    <input
                      type="number"
                      value={maxIterationsForRobustness}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setMaxIterationsForRobustness(10000); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 10000) {
                            setMaxIterationsForRobustness(numValue);
                            SHyFTAConfigService.updateSetting('maxIterationsForRobustness', numValue);
                          }
                        }
                      }}
                      min="10000"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Limite massimo iterazioni</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>📏 Finestra Controllo Stabilità:</label>
                    <input
                      type="number"
                      value={stabilityCheckWindow}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setStabilityCheckWindow(10); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 10) {
                            setStabilityCheckWindow(numValue);
                            SHyFTAConfigService.updateSetting('stabilityCheckWindow', numValue);
                          }
                        }
                      }}
                      min="10"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Finestra per controlli stabilità</small>
                  </div>

                  <div className="form-group">
                    <label>🎯 Soglia Stabilità:</label>
                    <input
                      type="number"
                      value={stabilityThreshold}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setStabilityThreshold(0.01); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0.01 && numValue <= 1.0) {
                            setStabilityThreshold(numValue);
                            SHyFTAConfigService.updateSetting('stabilityThreshold', numValue);
                          }
                        }
                      }}
                      min="0.01"
                      max="1.0"
                      step="0.01"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Soglia per controlli stabilità</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>📐 Finestra Convergenza CI:</label>
                    <input
                      type="number"
                      value={convergenceCheckWindow}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setConvergenceCheckWindow(5); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 5) {
                            setConvergenceCheckWindow(numValue);
                            SHyFTAConfigService.updateSetting('convergenceCheckWindow', numValue);
                          }
                        }
                      }}
                      min="5"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Finestra per controlli convergenza</small>
                  </div>

                  <div className="form-group">
                    <label>🔍 Soglia Convergenza:</label>
                    <input
                      type="number"
                      value={convergenceThreshold}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setConvergenceThreshold(0.01); // Default minimo
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0.01 && numValue <= 1.0) {
                            setConvergenceThreshold(numValue);
                            SHyFTAConfigService.updateSetting('convergenceThreshold', numValue);
                          }
                        }
                      }}
                      min="0.01"
                      max="1.0"
                      step="0.01"
                      disabled={isRunning || !confidenceToggle}
                    />
                    <small className="help-text">Soglia per controlli convergenza CI</small>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulation Progress Section */}
          {(isRunning || isCompleted) && (
            <div className="progress-section">
              <h3>{isRunning ? '🔄 Simulazione Automatica in Corso' : '✅ Simulazione Completata'}</h3>
              
              <div className="progress-info">
                <div className="current-step">{isCompleted ? 'Simulazione completata con successo!' : currentStep}</div>
                <ProgressBar progress={progress} />
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
                <LogTextarea
                  value={logOutput}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setResultsTimestep(0.01); // Default minimo
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue >= 0.01) {
                        setResultsTimestep(numValue);
                        SHyFTAConfigService.updateSetting('resultsTimestep', numValue);
                      }
                    }
                  }}
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
            onClick={handleClose}
            disabled={isRunning}
          >
            {isRunning ? 'Chiudi quando completato' : 'Chiudi'}
          </button>
          
          {/* Retrieve Results button - abilitato dopo simulazione (anche con stop criteria) */}
          {!isRunning && (
            <button 
              className={`test-button ${(!hasSimulationResults || modelChangedSinceLastRun) ? 'disabled' : ''}`}
              onClick={(hasSimulationResults && !modelChangedSinceLastRun) ? handleTestResultsLoading : undefined}
              title={
                !hasSimulationResults 
                  ? "Completa prima una simulazione SHyFTA per abilitare il caricamento dei risultati"
                  : modelChangedSinceLastRun 
                    ? "Il modello è cambiato dall'ultima simulazione. Esegui una nuova simulazione per abilitare il retrieve dei risultati."
                    : "Carica risultati simulazione dal file results.mat"
              }
              disabled={isLoadingResults || !hasSimulationResults || modelChangedSinceLastRun}
            >
              {isLoadingResults ? (
                <span>⏳ Loading...</span>
              ) : (
                <span>🔍 Retrieve Results</span>
              )}
            </button>
          )}

          {/* CI Analysis button - sempre visibile, abilitato solo con dati CI */}
          {!isRunning && onShowCIResults && (() => {
            const simulationResults = MatlabResultsService.getCurrentResults();
            const hasCIData = simulationResults?.ciHistory && simulationResults.ciHistory.length > 0;
            const isEnabled = hasSimulationResults && !modelChangedSinceLastRun && resultsLoaded && hasCIData;

            // DEBUG MERDA!
            console.log('🤬 [SHyFTA CI Button Debug]', {
              hasSimulationResults,
              modelChangedSinceLastRun,
              resultsLoaded,
              simulationResults: !!simulationResults,
              ciHistory: simulationResults?.ciHistory,
              ciHistoryLength: simulationResults?.ciHistory?.length || 0,
              hasCIData,
              isEnabled
            });

            return (
              <button
                className={`test-button ${!isEnabled ? 'disabled' : ''}`}
                onClick={isEnabled ? onShowCIResults : undefined}
                disabled={!isEnabled}
                title={
                  !hasSimulationResults
                    ? "Esegui prima una simulazione SHyFTA per abilitare l'analisi CI"
                    : modelChangedSinceLastRun
                      ? "Il modello è cambiato. Esegui una nuova simulazione per abilitare l'analisi CI."
                      : !resultsLoaded
                        ? "Premi prima 'Retrieve Results' per caricare i risultati della simulazione"
                        : !hasCIData
                          ? "Nessun dato CI trovato. Abilita 'Approssima con intervallo di confidenza' e riesegui la simulazione."
                          : "Visualizza analisi confidence interval della simulazione"
                }
              >
                📈 CI Analysis
              </button>
            );
          })()}


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