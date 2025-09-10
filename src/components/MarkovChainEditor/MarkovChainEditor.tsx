import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar/MenuBar';
import MarkovLeftPanel from '../MarkovLeftPanel/MarkovLeftPanel';
import MarkovCentralPanel from '../MarkovCentralPanel/MarkovCentralPanel';
import RightPanel from '../RightPanel/RightPanel';
import MarkovStateModal from '../MarkovStateModal/MarkovStateModal';
import MarkovTransitionModal from '../MarkovTransitionModal/MarkovTransitionModal';
import { MarkovChainModel, MarkovState, MarkovTransition } from '../../types/MarkovChain';
import { FileService } from '../../services/file-service';
import './MarkovChainEditor.css';

const MarkovChainEditor: React.FC = () => {
  const navigate = useNavigate();
  const [markovChainModel, setMarkovChainModel] = useState<MarkovChainModel>({
    states: [],
    transitions: []
  });

  const [selectedElement, setSelectedElement] = useState<MarkovState | MarkovTransition | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  
  // Click-to-place functionality
  const [clickToPlaceMode, setClickToPlaceMode] = useState(false);
  const [componentToPlace, setComponentToPlace] = useState<'state' | null>(null);
  const [nextStateNumber, setNextStateNumber] = useState(1);


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

  // Add state handler
  const handleAddState = useCallback((position?: { x: number; y: number }) => {
    const newState: MarkovState = {
      id: `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'state',
      name: `S${nextStateNumber}`,
      position: position || { x: 100, y: 100 },
      rewardFunction: 1,
      isAbsorbing: false
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
      setClickToPlaceMode(false);
      setComponentToPlace(null);
    }
  }, [clickToPlaceMode, componentToPlace, handleAddState]);

  // Toggle click-to-place mode
  const handleToggleClickToPlace = useCallback(() => {
    setClickToPlaceMode(prev => !prev);
    setComponentToPlace(null);
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

  // Connection handler
  const handleCreateConnection = useCallback((sourceId: string, targetId: string) => {
    const newTransition: MarkovTransition = {
      id: `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'transition',
      source: sourceId,
      target: targetId,
      probabilityDistribution: {
        type: 'constant',
        probability: 0.5
      }
    };

    setMarkovChainModel(prev => ({
      ...prev,
      transitions: [...prev.transitions, newTransition]
    }));
  }, []);

  // File operations handlers for MenuBar
  const handleSaveFile = useCallback(async () => {
    try {
      await FileService.saveModelWithMetadata(markovChainModel, 'markov-chain');
      alert('Markov Chain salvato con successo!');
    } catch (error) {
      alert(`Errore durante il salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }, [markovChainModel]);

  const handleOpenWithFileSystem = useCallback(() => {
    // Create file input for opening files
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const { model } = await FileService.openModelWithValidation(file, 'markov-chain');
          setMarkovChainModel(model as MarkovChainModel);
          alert('Markov Chain caricato con successo!');
        } catch (error) {
          alert(`Errore nel caricamento del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
        }
      }
    };
    input.click();
  }, []);

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
    alert('LLM configuration not available for Markov chains yet');
  }, []);

  const handleShowSHyFTA = useCallback(() => {
    alert('SHyFTA integration not available for Markov chains');
  }, []);

  const handleNewModel = useCallback(() => {
    if (markovChainModel.states.length > 0 || markovChainModel.transitions.length > 0) {
      if (window.confirm('Are you sure you want to create a new model? All unsaved changes will be lost.')) {
        setMarkovChainModel({ states: [], transitions: [] });
        setSelectedElement(null);
      }
    }
  }, [markovChainModel]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Navigation handlers
  const handleNavigateToFaultTree = useCallback(() => {
    navigate('/fault-tree-editor');
  }, [navigate]);

  const handleNavigateToMarkov = useCallback(() => {
    // Already on markov chain editor, no need to navigate
  }, []);

  // MSolver handler (placeholder for now)
  const handleShowMSolver = useCallback(() => {
    console.log('MSolver clicked');
    // TODO: Implement MSolver modal/functionality
  }, []);

  const handleLogout = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Toggle panels
  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelCollapsed(prev => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelCollapsed(prev => !prev);
  }, []);

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
        openedFile={null}
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
          onModelChange={setMarkovChainModel}
          onDeleteElement={handleDeleteElement}
          onCreateConnection={handleCreateConnection}
          onPanelClick={handlePanelClick}
          componentToPlace={componentToPlace}
          isDarkMode={isDarkMode}
          disableDeletion={showStateModal || showTransitionModal}
        />
      </div>
      
      <RightPanel 
        onGenerateFaultTree={() => {}}
        onModifyFaultTree={() => {}}
        currentFaultTree={{ events: [], gates: [], connections: [] }}
        isDarkMode={isDarkMode}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={handleToggleRightPanel}
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

    </div>
  );
};

export default MarkovChainEditor;