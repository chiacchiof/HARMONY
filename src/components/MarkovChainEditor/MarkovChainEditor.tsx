import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar/MenuBar';
import MarkovLeftPanel from '../MarkovLeftPanel/MarkovLeftPanel';
import MarkovCentralPanel from '../MarkovCentralPanel/MarkovCentralPanel';
import RightPanel from '../RightPanel/RightPanel';
import MarkovStateModal from '../MarkovStateModal/MarkovStateModal';
import MarkovTransitionModal from '../MarkovTransitionModal/MarkovTransitionModal';
import LLMConfigModal from '../LLMConfigModal/LLMConfigModal';
import MSolverModal from '../MSolverModal/MSolverModal';
import CTMCResultsModal from '../CTMCResultsModal/CTMCResultsModal';
import { MarkovChainModel, MarkovState, MarkovTransition } from '../../types/MarkovChain';
import { FileService } from '../../services/file-service';
import { useLLMConfig } from '../../contexts/LLMContext';
import { useModelPersistence } from '../../contexts/ModelPersistenceContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usePanel } from '../../contexts/PanelContext';
import CTMCResultsService from '../../services/ctmc-results-service';
import './MarkovChainEditor.css';

const MarkovChainEditor: React.FC = () => {
  const navigate = useNavigate();
  const { showLLMConfigModal, setShowLLMConfigModal, updateLLMConfig } = useLLMConfig();
  const {
    saveMarkovChainSnapshot,
    getMarkovChainSnapshot,
    clearSnapshots,
    saveMarkovChainOpenedFile,
    getMarkovChainOpenedFile
  } = useModelPersistence();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { isRightPanelCollapsed, toggleRightPanel } = usePanel();
  const [markovChainModel, setMarkovChainModel] = useState<MarkovChainModel>({
    states: [],
    transitions: []
  });

  const [selectedElement, setSelectedElement] = useState<MarkovState | MarkovTransition | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showMSolverModal, setShowMSolverModal] = useState(false);
  const [showCTMCResultsModal, setShowCTMCResultsModal] = useState(false);
  const [selectedResultsStateId, setSelectedResultsStateId] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  
  // Click-to-place functionality
  const [clickToPlaceMode, setClickToPlaceMode] = useState(false);
  const [componentToPlace, setComponentToPlace] = useState<'state' | null>(null);
  const [nextStateNumber, setNextStateNumber] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRestoringFromSnapshot, setIsRestoringFromSnapshot] = useState(false);

  // Ottieni il file aperto dal context
  const openedFile = getMarkovChainOpenedFile();


  // Helper function to update state counter
  const updateNextStateNumber = useCallback(() => {
    const stateNumbers = markovChainModel.states
      .map(state => {
        const match = state.name.match(/^S(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    const maxNumber = stateNumbers.length > 0 ? Math.max(...stateNumbers) : 0;
    setNextStateNumber(maxNumber + 1);
  }, [markovChainModel.states]);

  useEffect(() => {
    updateNextStateNumber();
  }, [updateNextStateNumber]);

  // Ripristina il modello dal snapshot al mount
  useEffect(() => {
    const snapshot = getMarkovChainSnapshot();
    if (snapshot && (markovChainModel.states.length === 0 && markovChainModel.transitions.length === 0)) {
      setIsRestoringFromSnapshot(true);
      setMarkovChainModel(snapshot);
      // Reset the flag after a short delay to allow React Flow to process
      setTimeout(() => setIsRestoringFromSnapshot(false), 100);
    }
  }, [getMarkovChainSnapshot, markovChainModel.states.length, markovChainModel.transitions.length]);

  // Salva automaticamente il snapshot ogni volta che il modello cambia
  useEffect(() => {
    // Solo se il modello non è vuoto, salva lo snapshot
    if (markovChainModel.states.length > 0 || markovChainModel.transitions.length > 0) {
      saveMarkovChainSnapshot(markovChainModel);
    }
  }, [markovChainModel, saveMarkovChainSnapshot]);

  // Add state handler
  const handleAddState = useCallback((position?: { x: number; y: number }) => {
    const newState: MarkovState = {
      id: `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'state',
      name: `S${nextStateNumber}`,
      position: position || { x: 100, y: 100 },
      rewardFunction: 1,
      isAbsorbing: false,
      isInitial: false
    };

    setMarkovChainModel(prev => ({
      ...prev,
      states: [...prev.states, newState]
    }));

    updateNextStateNumber();
  }, [nextStateNumber, updateNextStateNumber]);

  // Element click handler
  const handleElementClick = useCallback((element: MarkovState | MarkovTransition) => {
    setSelectedElement(element);
    if (element.type === 'state') {
      setShowStateModal(true);
    } else if (element.type === 'transition') {
      setShowTransitionModal(true);
    }
  }, []);

  // Panel click handler for click-to-place mode
  const handlePanelClick = useCallback((position: { x: number; y: number }) => {
    if (clickToPlaceMode && componentToPlace === 'state') {
      handleAddState(position);
      // Keep click-to-place mode active for instant add functionality
      // Mode will only be disabled when user manually toggles it off
    }
  }, [clickToPlaceMode, componentToPlace, handleAddState]);

  // Toggle click-to-place mode
  const handleToggleClickToPlace = useCallback(() => {
    setClickToPlaceMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // Activating click-to-place mode
        setComponentToPlace('state');
      } else {
        // Deactivating click-to-place mode
        setComponentToPlace(null);
      }
      return newMode;
    });
  }, []);

  // Update element handler
  const handleUpdateElement = useCallback((updatedElement: MarkovState | MarkovTransition) => {
    if (updatedElement.type === 'state') {
      setMarkovChainModel(prev => ({
        ...prev,
        states: prev.states.map(state => 
          state.id === updatedElement.id ? updatedElement as MarkovState : state
        )
      }));
      setShowStateModal(false);
    } else if (updatedElement.type === 'transition') {
      setMarkovChainModel(prev => ({
        ...prev,
        transitions: prev.transitions.map(transition => 
          transition.id === updatedElement.id ? updatedElement as MarkovTransition : transition
        )
      }));
      setShowTransitionModal(false);
    }
    setSelectedElement(null);
  }, []);

  // Delete element handler
  const handleDeleteElement = useCallback((elementId: string) => {
    setMarkovChainModel(prev => ({
      ...prev,
      states: prev.states.filter(state => state.id !== elementId),
      transitions: prev.transitions.filter(transition => 
        transition.id !== elementId && 
        transition.source !== elementId && 
        transition.target !== elementId
      )
    }));
  }, []);

  // Remove outgoing transitions from a state (used when marking as absorbing)
  const handleRemoveOutgoingTransitions = useCallback((stateId: string) => {
    setMarkovChainModel(prev => ({
      ...prev,
      transitions: prev.transitions.filter(transition => transition.source !== stateId)
    }));
  }, []);

  // Set a state as initial (ensure only one initial state at a time)
  const handleSetAsInitial = useCallback((stateId: string) => {
    setMarkovChainModel(prev => ({
      ...prev,
      states: prev.states.map(state => ({
        ...state,
        isInitial: state.id === stateId
      }))
    }));
  }, []);

  // Connection handler
  const handleCreateConnection = useCallback((sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => {
    console.log('Creating connection:', {
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle
    });

    // Check if source state is absorbing
    const sourceState = markovChainModel.states.find(state => state.id === sourceId);
    if (sourceState && sourceState.isAbsorbing) {
      alert('Cannot create transitions from an absorbing state. Absorbing states have no outgoing transitions.');
      return;
    }

    const newTransition: MarkovTransition = {
      id: `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'transition',
      source: sourceId,
      target: targetId,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      probabilityDistribution: {
        type: 'exponential',
        lambda: 1.0
      }
    };

    setMarkovChainModel(prev => ({
      ...prev,
      transitions: [...prev.transitions, newTransition]
    }));
  }, [markovChainModel.states]);

  // File operations handlers for MenuBar
  const handleSaveFile = useCallback(async () => {
    try {
      const result = await FileService.saveModelWithOverwrite(
        markovChainModel,
        'markov-chain',
        openedFile?.fileHandle,
        openedFile?.filename
      );
      saveMarkovChainOpenedFile(result);
      alert('Markov Chain salvato con successo!');
    } catch (error) {
      alert(`Errore durante il salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }, [markovChainModel, saveMarkovChainOpenedFile, openedFile]);

  const handleOpenWithFileSystem = useCallback(async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });

        const file = await fileHandle.getFile();
        const { model } = await FileService.openModelWithValidation(file, 'markov-chain');

        // Clear previous CTMC results when loading a new model
        CTMCResultsService.clearResults();

        setMarkovChainModel(model as MarkovChainModel);

        saveMarkovChainOpenedFile({
          url: URL.createObjectURL(file),
          filename: file.name,
          fileHandle: fileHandle
        });

        alert('Markov Chain caricato con successo!');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // L'utente ha annullato la selezione
          return;
        }
        if (error instanceof Error && error.name === 'NotAllowedError') {
          // L'utente ha negato i permessi
          alert('Permessi negati per l\'accesso ai file. Usa il pulsante "Apri" per selezionare manualmente un file.');
          return;
        }
        // Se c'è un errore diverso dall'annullamento o permessi negati, mostra l'errore ma non aprire il fallback
        console.error('Errore durante l\'apertura del file:', error);
        alert(`Errore durante l'apertura del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      }
    } else {
      // Fallback al metodo tradizionale solo se l'API non è supportata
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const { model } = await FileService.openModelWithValidation(file, 'markov-chain');

            // Clear previous CTMC results when loading a new model
            CTMCResultsService.clearResults();

            setMarkovChainModel(model as MarkovChainModel);

            saveMarkovChainOpenedFile({
              url: URL.createObjectURL(file),
              filename: file.name
            });

            alert('Markov Chain caricato con successo!');
          } catch (error) {
            alert(`Errore nel caricamento del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
          }
        }
      };
      input.click();
    }
  }, [saveMarkovChainOpenedFile]);

  const handleExportCode = useCallback(() => {
    // Export as text representation
    const codeStr = `// Markov Chain Model
// States: ${markovChainModel.states.length}
// Transitions: ${markovChainModel.transitions.length}

States:
${markovChainModel.states.map(state => 
  `- ${state.name}: ${state.isAbsorbing ? 'Absorbing' : 'Transient'}, Reward: ${state.rewardFunction}`
).join('\n')}

Transitions:
${markovChainModel.transitions.map(transition => {
  const from = markovChainModel.states.find(s => s.id === transition.source)?.name || transition.source;
  const to = markovChainModel.states.find(s => s.id === transition.target)?.name || transition.target;
  const dist = transition.probabilityDistribution;
  let distStr = '';
  switch(dist.type) {
    case 'constant': distStr = `p=${dist.probability}`; break;
    case 'exponential': distStr = `λ=${dist.lambda}`; break;
    case 'weibull': distStr = `k=${dist.k}, λ=${dist.lambda}, μ=${dist.mu}`; break;
    case 'normal': distStr = `μ=${dist.mu}, σ=${dist.sigma}`; break;
  }
  return `- ${from} → ${to}: ${dist.type}(${distStr})`;
}).join('\n')}`;

    const blob = new Blob([codeStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `markov-chain-code-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [markovChainModel]);

  const handleShowSaveModal = useCallback(() => {
    // Same as handleSaveFile for now
    handleSaveFile();
  }, [handleSaveFile]);

  const handleExportXML = useCallback(() => {
    alert('XML export for Markov chains not implemented yet');
  }, []);

  const handleExportCSV = useCallback(() => {
    // Export states and transitions as CSV
    const statesCSV = [
      'ID,Name,Type,RewardFunction,IsAbsorbing',
      ...markovChainModel.states.map(state => 
        `${state.id},${state.name},State,${state.rewardFunction},${state.isAbsorbing}`
      )
    ].join('\n');

    const transitionsCSV = [
      'ID,Source,Target,DistributionType,Parameters',
      ...markovChainModel.transitions.map(transition => {
        const dist = transition.probabilityDistribution;
        let params = '';
        switch(dist.type) {
          case 'constant': params = `probability=${dist.probability}`; break;
          case 'exponential': params = `lambda=${dist.lambda}`; break;
          case 'weibull': params = `k=${dist.k};lambda=${dist.lambda};mu=${dist.mu}`; break;
          case 'normal': params = `mu=${dist.mu};sigma=${dist.sigma}`; break;
        }
        return `${transition.id},${transition.source},${transition.target},${dist.type},"${params}"`;
      })
    ].join('\n');

    const fullCSV = `States:\n${statesCSV}\n\nTransitions:\n${transitionsCSV}`;
    const blob = new Blob([fullCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `markov-chain-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [markovChainModel]);

  const handleExportMatlab = useCallback(() => {
    alert('MATLAB export for Markov chains not implemented yet');
  }, []);

  const handleShowLLMConfig = useCallback(() => {
    setShowLLMConfigModal(true);
  }, [setShowLLMConfigModal]);

  const handleLLMConfigChange = useCallback((newConfig: any) => {
    updateLLMConfig(newConfig);
  }, [updateLLMConfig]);

  const handleGenerateMarkovChain = useCallback((generatedModel: MarkovChainModel) => {
    setMarkovChainModel(generatedModel);
  }, []);


  const handleNewModel = useCallback(() => {
    if (markovChainModel.states.length > 0 || markovChainModel.transitions.length > 0) {
      if (window.confirm('Are you sure you want to create a new model? All unsaved changes will be lost.')) {
        // Clear previous CTMC results when creating a new model
        CTMCResultsService.clearResults();

        setMarkovChainModel({ states: [], transitions: [] });
        setSelectedElement(null);
        saveMarkovChainOpenedFile(null); // Reset del file aperto
      }
    }
  }, [markovChainModel, saveMarkovChainOpenedFile]);

  const handleToggleDarkMode = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  // Navigation handlers
  const handleNavigateToFaultTree = useCallback(() => {
    saveMarkovChainSnapshot(markovChainModel);
    navigate('/fault-tree-editor');
  }, [navigate, saveMarkovChainSnapshot, markovChainModel]);

  const handleNavigateToMarkov = useCallback(() => {
    // Already on markov chain editor, no need to navigate
  }, []);

  // MSolver handler
  const handleShowMSolver = useCallback(() => {
    setShowMSolverModal(true);
  }, []);

  // CTMC Results handler
  const handleViewResults = useCallback((stateId: string) => {
    setSelectedResultsStateId(stateId);
    setShowCTMCResultsModal(true);
  }, []);

  const handleLogout = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Handle model changes from the central panel (especially for position updates)
  const handleModelChange = useCallback((updatedModel: MarkovChainModel) => {
    setMarkovChainModel(updatedModel);
  }, []);

  // Toggle panels
  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelCollapsed(prev => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    toggleRightPanel();
  }, [toggleRightPanel]);

  // Reorganize states to center
  const handleReorganizeComponents = useCallback(() => {
    if (markovChainModel.states.length === 0) return;
    
    const gridSpacing = 200;
    const cols = Math.ceil(Math.sqrt(markovChainModel.states.length));
    
    const reorganizedStates = markovChainModel.states.map((state, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...state,
        position: {
          x: col * gridSpacing,
          y: row * gridSpacing
        }
      };
    });

    setMarkovChainModel({
      ...markovChainModel,
      states: reorganizedStates
    });
  }, [markovChainModel]);

  return (
    <div className={`markov-chain-editor ${isDarkMode ? 'dark-mode' : ''}`}>
      <MenuBar
        onSave={handleSaveFile}
        onOpenWithFileSystem={handleOpenWithFileSystem}
        onExportCode={handleExportCode}
        onShowSaveModal={handleShowSaveModal}
        onExportXML={handleExportXML}
        onExportCSV={handleExportCSV}
        onExportMatlab={handleExportMatlab}
        onShowLLMConfig={handleShowLLMConfig}
        onShowMSolver={handleShowMSolver}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onNewModel={handleNewModel}
        onClearAllModels={clearSnapshots}
        openedFile={openedFile}
        currentEditor="markov-chain"
        onNavigateToFaultTree={handleNavigateToFaultTree}
        onNavigateToMarkov={handleNavigateToMarkov}
        onLogout={handleLogout}
      />
      
      <MarkovLeftPanel 
        onAddState={handleAddState}
        clickToPlaceMode={clickToPlaceMode}
        onToggleClickToPlace={handleToggleClickToPlace}
        componentToPlace={componentToPlace}
        setComponentToPlace={setComponentToPlace}
        isDarkMode={isDarkMode}
        isCollapsed={isLeftPanelCollapsed}
        onToggleCollapse={handleToggleLeftPanel}
      />
      
      <div className={`editor-content ${isLeftPanelCollapsed ? 'left-panel-collapsed' : ''} ${isRightPanelCollapsed ? 'right-panel-collapsed' : ''}`}>
        <MarkovCentralPanel 
          markovChainModel={markovChainModel}
          onElementClick={handleElementClick}
          onModelChange={handleModelChange}
          onDeleteElement={handleDeleteElement}
          onCreateConnection={handleCreateConnection}
          onPanelClick={handlePanelClick}
          onViewResults={handleViewResults}
          componentToPlace={componentToPlace}
          isDarkMode={isDarkMode}
          disableDeletion={showStateModal || showTransitionModal}
          onReorganizeComponents={handleReorganizeComponents}
        />
      </div>
      
      <RightPanel 
        onGenerateFaultTree={() => {}}
        onModifyFaultTree={() => {}}
        currentFaultTree={{ events: [], gates: [], connections: [] }}
        isDarkMode={isDarkMode}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={handleToggleRightPanel}
        editorType="markov-chain"
        onGenerateMarkovChain={handleGenerateMarkovChain}
      />

      {showStateModal && selectedElement && selectedElement.type === 'state' && (
        <MarkovStateModal
          state={selectedElement}
          onSave={handleUpdateElement}
          onClose={() => {
            setShowStateModal(false);
            setSelectedElement(null);
          }}
          isDarkMode={isDarkMode}
          onRemoveTransitions={handleRemoveOutgoingTransitions}
          onSetAsInitial={handleSetAsInitial}
        />
      )}

      {showTransitionModal && selectedElement && selectedElement.type === 'transition' && (
        <MarkovTransitionModal
          transition={selectedElement}
          onSave={handleUpdateElement}
          onClose={() => {
            setShowTransitionModal(false);
            setSelectedElement(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      <LLMConfigModal
        isOpen={showLLMConfigModal}
        onClose={() => setShowLLMConfigModal(false)}
        onConfigChange={handleLLMConfigChange}
      />

      <MSolverModal
        isOpen={showMSolverModal}
        onClose={() => setShowMSolverModal(false)}
        markovChainModel={markovChainModel}
      />

      <CTMCResultsModal
        isOpen={showCTMCResultsModal}
        onClose={() => {
          setShowCTMCResultsModal(false);
          setSelectedResultsStateId(null);
        }}
        stateId={selectedResultsStateId}
        stateName={selectedResultsStateId ? markovChainModel.states.find(s => s.id === selectedResultsStateId)?.name || null : null}
        matlabStateIndex={selectedResultsStateId ? 
          [...markovChainModel.states]
            .sort((a, b) => {
              const aId = parseInt(a.id.replace('state-', '')) || 0;
              const bId = parseInt(b.id.replace('state-', '')) || 0;
              return aId - bId;
            })
            .findIndex(s => s.id === selectedResultsStateId) + 1 : undefined
        }
      />

    </div>
  );
};

export default MarkovChainEditor;