import React, { useState, useEffect } from 'react';
import { FaultTreeModel } from '../../types/FaultTree';
import { SHyFTAService, SHyFTAConfig, SHyFTAProgress } from '../../services/shyfta-service';
import { SHyFTAConfig as SHyFTAConfigService, SHyFTASettings } from '../../config/shyfta-config';
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
  const [modelName, setModelName] = useState('');
  const [iterations, setIterations] = useState(1000);
  const [confidence, setConfidence] = useState(0.95);
  const [confidenceToggle, setConfidenceToggle] = useState(true);
  
  // State for simulation
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logOutput, setLogOutput] = useState('');
  
  // State for stop confirmation
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

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
      
      // Generate new model name or use saved pattern
      if (!modelName) {
        setModelName(SHyFTAConfigService.generateDefaultModelName());
      }
      
      // Setup progress callback
      SHyFTAService.setProgressCallback((progressData: SHyFTAProgress) => {
        setProgress(progressData.progress);
        setCurrentStep(progressData.currentStep);
        setLogOutput(prev => prev + progressData.logOutput);
        setIsRunning(progressData.isRunning);
      });
    }
    
    return () => {
      // Cleanup on unmount
      SHyFTAService.setProgressCallback(() => {});
    };
  }, [isOpen, modelName]);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        
        // Try to get the full path if possible
        let fullPath = dirHandle.name;
        
        // In modern browsers, we can try to resolve the full path
        try {
          // This is experimental - in production you'd need a backend service
          // to get the actual full path from the file handle
          if (dirHandle.resolve) {
            const pathSegments = await dirHandle.resolve();
            if (pathSegments && pathSegments.length > 0) {
              fullPath = pathSegments.join('/');
            }
          }
          
          // Fallback: create a more realistic path for demo
          // In reality, this would come from a backend service or Electron main process
          if (fullPath === dirHandle.name && !fullPath.includes('/') && !fullPath.includes('\\')) {
            // Simulate a full path for demo purposes
            fullPath = `C:\\Users\\User\\Documents\\MATLAB\\${dirHandle.name}`;
          }
          
        } catch (resolveError) {
          console.log('Could not resolve full path, using folder name');
          // For demo, let's create a plausible full path
          fullPath = `C:\\Users\\User\\Documents\\MATLAB\\${dirHandle.name}`;
        }
        
        setShyftaLibFolder(fullPath);
        
        // Save to persistent config
        SHyFTAConfigService.updateSetting('shyftaLibFolder', fullPath);
      } else {
        // Fallback: ask user to input path manually
        const path = prompt('Inserisci il percorso completo della cartella SHyFTALib:\n(esempio: C:\\Users\\NomeUtente\\Documents\\MATLAB\\SHyFTALib)');
        if (path) {
          setShyftaLibFolder(path);
          // Save to persistent config
          SHyFTAConfigService.updateSetting('shyftaLibFolder', path);
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      // Fallback: ask user to input path manually
      const path = prompt('Inserisci il percorso completo della cartella SHyFTALib:\n(esempio: C:\\Users\\NomeUtente\\Documents\\MATLAB\\SHyFTALib)');
      if (path) {
        setShyftaLibFolder(path);
        // Save to persistent config
        SHyFTAConfigService.updateSetting('shyftaLibFolder', path);
      }
    }
  };

  const buildConfig = (): SHyFTAConfig => ({
    shyftaLibFolder,
    modelName,
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
      lastUsedModelName: modelName
    };
    SHyFTAConfigService.saveSettings(currentSettings);
    
    // Reset progress state
    setIsRunning(true);
    setProgress(0);
    setLogOutput('');
    setCurrentStep('Inizializzazione...');

    try {
      await SHyFTAService.runSimulation(faultTreeModel, config);
      alert('🎯 Sistema SHyFTA pronto!\n\nFile creati nella cartella SHyFTALib:\n• ' + modelName + ' (fault tree model)\n• ZFTAMain.m (script configurato)\n• runSHyFTA.bat (launcher aggiornato)\n\n✅ Per avviare la simulazione:\nFai doppio clic su runSHyFTA.bat\n\n📊 I risultati appariranno in output/results.m');
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
              <label>📁 Cartella SHyFTALib (percorso completo):</label>
              <div className="folder-input">
                <input
                  type="text"
                  value={shyftaLibFolder}
                  onChange={(e) => {
                    setShyftaLibFolder(e.target.value);
                    // Auto-save when user types
                    if (e.target.value.trim()) {
                      SHyFTAConfigService.updateSetting('shyftaLibFolder', e.target.value);
                    }
                  }}
                  placeholder="C:\Users\NomeUtente\Documents\MATLAB\SHyFTALib"
                  disabled={isRunning}
                  className="full-path-input"
                />
                <button 
                  type="button" 
                  onClick={handleSelectFolder}
                  className="folder-select-btn"
                  disabled={isRunning}
                  title="Sfoglia per selezionare cartella"
                >
                  📂 Sfoglia
                </button>
              </div>
              <small className="folder-help">
                💡 Inserisci il percorso completo della cartella SHyFTALib<br/>
                ℹ️ Verrà creato un file .bat per lanciare automaticamente MATLAB nella cartella specificata.
              </small>
            </div>

            <div className="form-group">
              <label>📄 Nome Modello:</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="initFaultTree_ddmmaaaa_hh:mm:ss.m"
                disabled={isRunning}
              />
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
          {isRunning && (
            <div className="progress-section">
              <h3>🔄 Simulazione Automatica in Corso</h3>
              
              <div className="progress-info">
                <div className="current-step">{currentStep}</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <span className="progress-text">{progress.toFixed(1)}%</span>
                </div>
              </div>

              <div className="log-output">
                <h4>📝 Output Log:</h4>
                <textarea
                  value={logOutput}
                  readOnly
                  rows={6}
                  placeholder="I log della simulazione appariranno qui..."
                />
              </div>
            </div>
          )}

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
            {isRunning ? 'Chiudi quando completato' : 'Annulla'}
          </button>
          
          {!isRunning && (
            <button 
              className="run-button primary" 
              onClick={handleRunSimulation}
              disabled={!shyftaLibFolder || !modelName}
            >
              🚀 Run SHyFTA
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