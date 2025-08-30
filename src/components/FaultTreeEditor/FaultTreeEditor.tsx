import React, { useState, useCallback } from 'react';
import MenuBar from '../MenuBar/MenuBar';
import LeftPanel from '../LeftPanel/LeftPanel';
import CentralPanel from '../CentralPanel/CentralPanel';
import RightPanel from '../RightPanel/RightPanel';
import ParameterModal from '../ParameterModal/ParameterModal';
import SaveModal from '../SaveModal/SaveModal';
import LLMConfigModal from '../LLMConfigModal/LLMConfigModal';
import MatlabExportModal from '../MatlabExportModal/MatlabExportModal';
import { FaultTreeModel, BaseEvent, Gate, GateType } from '../../types/FaultTree';
import { FaultTreeModification } from '../../types/ChatIntegration';
import { FileService } from '../../services/file-service';
import { LLMProviders, loadLLMConfig, saveLLMConfig } from '../../config/llm-config';
import './FaultTreeEditor.css';

const FaultTreeEditor: React.FC = () => {
  const [faultTreeModel, setFaultTreeModel] = useState<FaultTreeModel>({
    events: [],
    gates: [],
    connections: []
  });

  const [selectedElement, setSelectedElement] = useState<BaseEvent | Gate | null>(null);
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLLMConfigModal, setShowLLMConfigModal] = useState(false);
  const [showMatlabExportModal, setShowMatlabExportModal] = useState(false);
  const [missionTime, setMissionTime] = useState(500); // Default mission time in hours
  const [llmConfig, setLlmConfig] = useState<LLMProviders>(loadLLMConfig());
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Stato per modalità click-to-place
  const [clickToPlaceMode, setClickToPlaceMode] = useState(false);
  const [componentToPlace, setComponentToPlace] = useState<{
    type: 'event' | 'gate';
    gateType?: GateType;
  } | null>(null);

  // Gestione aggiunta eventi base
  const handleAddBaseEvent = useCallback(() => {
    if (clickToPlaceMode) {
      // Modalità click-to-place: prepara il componente per il posizionamento
      setComponentToPlace({ type: 'event' });
    } else {
      // Modalità normale: aggiungi subito con posizione casuale
      const newEvent: BaseEvent = {
        id: `event-${Date.now()}`,
        type: 'basic-event',
        name: `BE_${faultTreeModel.events.length + 1}`,
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        parameters: {},
        failureProbabilityDistribution: { type: 'exponential', lambda: 0.01 }
      };

      setFaultTreeModel(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
    }
  }, [clickToPlaceMode, faultTreeModel.events.length]);

  // Gestione aggiunta porte
  const handleAddGate = useCallback((gateType: GateType) => {
    if (clickToPlaceMode) {
      // Modalità click-to-place: prepara il componente per il posizionamento
      setComponentToPlace({ type: 'gate', gateType });
    } else {
      // Modalità normale: aggiungi subito con posizione casuale
      const newGate: Gate = {
        id: `gate-${Date.now()}`,
        type: 'gate',
        gateType,
        name: `${gateType}_${faultTreeModel.gates.length + 1}`,
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        inputs: [],
        isFailureGate: false,
        parameters: {}
      };

      setFaultTreeModel(prev => ({
        ...prev,
        gates: [...prev.gates, newGate]
      }));
    }
  }, [clickToPlaceMode, faultTreeModel.gates.length]);

  // Gestione click su elemento per aprire parametri
  const handleElementClick = useCallback((element: BaseEvent | Gate) => {
    setSelectedElement(element);
    setShowParameterModal(true);
  }, []);

  // Gestione click sul pannello per posizionare componente
  const handlePanelClick = useCallback((position: { x: number; y: number }) => {
    if (!componentToPlace) return;

    if (componentToPlace.type === 'event') {
      const newEvent: BaseEvent = {
        id: `event-${Date.now()}`,
        type: 'basic-event',
        name: `BE_${faultTreeModel.events.length + 1}`,
        position,
        parameters: {},
        failureProbabilityDistribution: { type: 'exponential', lambda: 0.01 }
      };

      setFaultTreeModel(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
    } else if (componentToPlace.type === 'gate' && componentToPlace.gateType) {
      const newGate: Gate = {
        id: `gate-${Date.now()}`,
        type: 'gate',
        gateType: componentToPlace.gateType,
        name: `Porta ${componentToPlace.gateType} ${faultTreeModel.gates.length + 1}`,
        position,
        inputs: [],
        isFailureGate: false,
        parameters: {}
      };

      setFaultTreeModel(prev => ({
        ...prev,
        gates: [...prev.gates, newGate]
      }));
    }

    // NON resettare componentToPlace - mantieni la selezione per posizionamenti multipli
    // setComponentToPlace(null); // Rimosso
  }, [componentToPlace, faultTreeModel.events.length, faultTreeModel.gates.length]);

  // Toggle modalità click-to-place
  const handleToggleClickToPlace = useCallback(() => {
    setClickToPlaceMode(prev => !prev);
    setComponentToPlace(null); // Reset componente selezionato
  }, []);

  // Gestione aggiornamento parametri
  const handleUpdateElement = useCallback((updatedElement: BaseEvent | Gate) => {
    if (updatedElement.type === 'basic-event') {
      setFaultTreeModel(prev => ({
        ...prev,
        events: prev.events.map(event => 
          event.id === updatedElement.id ? updatedElement as BaseEvent : event
        )
      }));
    } else {
      setFaultTreeModel(prev => ({
        ...prev,
        gates: prev.gates.map(gate => 
          gate.id === updatedElement.id ? updatedElement as Gate : gate
        )
      }));
    }
    setShowParameterModal(false);
    setSelectedElement(null);
  }, []);

  // Gestione salvataggio file
  const handleSaveFile = useCallback(() => {
    const dataStr = JSON.stringify(faultTreeModel, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fault-tree.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [faultTreeModel]);

  // Gestione apertura file
  const handleOpenFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const model = await FileService.openFaultTree(file);
        setFaultTreeModel(model);
        alert('File caricato con successo!');
      } catch (error) {
        alert(`Errore nel caricamento del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      }
    }
  }, []);

  // Gestione esportazione XML
  const handleExportXML = useCallback(() => {
    FileService.exportToXML(faultTreeModel);
  }, [faultTreeModel]);

  // Gestione esportazione CSV
  const handleExportCSV = useCallback(() => {
    FileService.exportToCSV(faultTreeModel);
  }, [faultTreeModel]);

  // Gestione apertura SaveModal
  const handleShowSaveModal = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  // Gestione apertura LLM Config Modal
  const handleShowLLMConfig = useCallback(() => {
    setShowLLMConfigModal(true);
  }, []);

  // Gestione apertura MATLAB Export Modal
  const handleShowMatlabExport = useCallback(() => {
    setShowMatlabExportModal(true);
  }, []);

  // Gestione cambio mission time
  const handleMissionTimeChange = useCallback((value: number) => {
    setMissionTime(value);
  }, []);

  // Gestione salvataggio configurazione LLM
  const handleLLMConfigChange = useCallback((newConfig: LLMProviders) => {
    setLlmConfig(newConfig);
    saveLLMConfig(newConfig);
  }, []);

  // Gestione toggle dark mode
  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Gestione esportazione codice
  const handleExportCode = useCallback(() => {
    const codeStr = generateFaultTreeCode(faultTreeModel);
    const dataBlob = new Blob([codeStr], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fault-tree-code.txt';
    link.click();
    URL.revokeObjectURL(url);
  }, [faultTreeModel]);

  // Funzione per trovare tutti gli elementi collegati a una gate (ricorsiva)
  const findConnectedElements = useCallback((gateId: string, visited = new Set<string>()): string[] => {
    if (visited.has(gateId)) return [];
    visited.add(gateId);
    
    const gate = faultTreeModel.gates.find(g => g.id === gateId);
    if (!gate) return [];
    
    const connected: string[] = [];
    
    // Aggiungi tutti gli input della gate
    gate.inputs.forEach(inputId => {
      connected.push(inputId);
      
      // Se l'input è una gate, trova ricorsivamente i suoi elementi collegati
      const inputGate = faultTreeModel.gates.find(g => g.id === inputId);
      if (inputGate) {
        connected.push(...findConnectedElements(inputId, visited));
      }
    });
    
    return connected;
  }, [faultTreeModel.gates]);

  // Gestione cancellazione elemento
  const handleDeleteElement = useCallback((elementId: string) => {
    const element = [...faultTreeModel.events, ...faultTreeModel.gates].find(e => e.id === elementId);
    if (!element) return;

    if (element.type === 'gate') {
      // Cancellazione gate: elimina tutti gli elementi collegati
      const connectedIds = findConnectedElements(elementId);
      
      setFaultTreeModel(prev => ({
        ...prev,
        events: prev.events.filter(event => !connectedIds.includes(event.id)),
        gates: prev.gates.filter(gate => gate.id !== elementId && !connectedIds.includes(gate.id)),
        connections: prev.connections.filter(conn => 
          conn.source !== elementId && 
          conn.target !== elementId &&
          !connectedIds.includes(conn.source) &&
          !connectedIds.includes(conn.target)
        )
      }));
    } else {
      // Cancellazione evento base: rimuovi solo l'evento e i suoi collegamenti
      setFaultTreeModel(prev => ({
        ...prev,
        events: prev.events.filter(event => event.id !== elementId),
        connections: prev.connections.filter(conn => 
          conn.source !== elementId && conn.target !== elementId
        ),
        // Rimuovi l'evento dagli input delle gate
        gates: prev.gates.map(gate => ({
          ...gate,
          inputs: gate.inputs.filter(inputId => inputId !== elementId)
        }))
      }));
    }
  }, [faultTreeModel, findConnectedElements]);

  // Gestione cancellazione collegamento
  const handleDeleteConnection = useCallback((connectionId: string) => {
    const connection = faultTreeModel.connections.find(c => c.id === connectionId);
    if (!connection) return;

    setFaultTreeModel(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      // Rimuovi l'input dalla gate target
      gates: prev.gates.map(gate => 
        gate.id === connection.target 
          ? { ...gate, inputs: gate.inputs.filter(inputId => inputId !== connection.source) }
          : gate
      )
    }));
  }, [faultTreeModel]);

  // Gestione generazione fault tree dal chatbot
  const handleGenerateFaultTree = useCallback((generatedModel: FaultTreeModel) => {
    // Merge del modello generato con quello esistente
    setFaultTreeModel(prev => ({
      events: [...prev.events, ...generatedModel.events],
      gates: [...prev.gates, ...generatedModel.gates],
      connections: [...prev.connections, ...generatedModel.connections],
      topEvent: generatedModel.topEvent || prev.topEvent
    }));
  }, []);

  // Gestione modifiche fault tree dal chatbot
  const handleModifyFaultTree = useCallback((modifications: FaultTreeModification[]) => {
    modifications.forEach(mod => {
      switch (mod.type) {
        case 'add':
          if (mod.elementType === 'event') {
            const newEvent: BaseEvent = {
              id: `event-${Date.now()}`,
              type: 'basic-event',
              name: mod.data.name || 'Nuovo Evento',
              position: mod.data.position || { x: 300, y: 200 },
              parameters: mod.data.parameters || {},
              failureProbabilityDistribution: mod.data.failureProbabilityDistribution || { type: 'exponential', lambda: 0.01 }
            };
            setFaultTreeModel(prev => ({
              ...prev,
              events: [...prev.events, newEvent]
            }));
          } else if (mod.elementType === 'gate') {
            const newGate: Gate = {
              id: `gate-${Date.now()}`,
              type: 'gate',
              gateType: mod.data.gateType || 'OR',
              name: mod.data.name || 'Nuova Porta',
              position: mod.data.position || { x: 300, y: 200 },
              inputs: [],
              isFailureGate: false,
              parameters: mod.data.parameters || {}
            };
            setFaultTreeModel(prev => ({
              ...prev,
              gates: [...prev.gates, newGate]
            }));
          }
          break;
          
        case 'remove':
          if (mod.elementId) {
            handleDeleteElement(mod.elementId);
          }
          break;
          
        case 'update':
          if (mod.elementId && mod.data) {
            setFaultTreeModel(prev => ({
              ...prev,
              events: prev.events.map(event => 
                event.id === mod.elementId ? { ...event, ...mod.data } : event
              ),
              gates: prev.gates.map(gate => 
                gate.id === mod.elementId ? { ...gate, ...mod.data } : gate
              )
            }));
          }
          break;
      }
    });
  }, [handleDeleteElement]);

  return (
    <div className={`fault-tree-editor ${isDarkMode ? 'dark-mode' : ''}`}>
              <MenuBar
          onSave={handleSaveFile}
          onOpen={handleOpenFile}
          onExportCode={handleExportCode}
          onShowSaveModal={handleShowSaveModal}
          onExportXML={handleExportXML}
          onExportCSV={handleExportCSV}
          onExportMatlab={handleShowMatlabExport}
          onShowLLMConfig={handleShowLLMConfig}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      
      <div className="editor-content">
        <LeftPanel 
          onAddBaseEvent={handleAddBaseEvent}
          onAddGate={handleAddGate}
          clickToPlaceMode={clickToPlaceMode}
          onToggleClickToPlace={handleToggleClickToPlace}
          componentToPlace={componentToPlace}
          missionTime={missionTime}
          onMissionTimeChange={handleMissionTimeChange}
          isDarkMode={isDarkMode}
        />
        
        <CentralPanel 
          faultTreeModel={faultTreeModel}
          onElementClick={handleElementClick}
          onModelChange={setFaultTreeModel}
          onDeleteElement={handleDeleteElement}
          onDeleteConnection={handleDeleteConnection}
          onPanelClick={handlePanelClick}
          componentToPlace={componentToPlace}
          isDarkMode={isDarkMode}
          disableDeletion={showParameterModal}
        />
        
        <RightPanel 
          onGenerateFaultTree={handleGenerateFaultTree}
          onModifyFaultTree={handleModifyFaultTree}
          currentFaultTree={faultTreeModel}
          isDarkMode={isDarkMode}
        />
      </div>

      {showParameterModal && selectedElement && (
        <ParameterModal
          element={selectedElement}
          onSave={handleUpdateElement}
          onClose={() => {
            setShowParameterModal(false);
            setSelectedElement(null);
          }}
          faultTreeModel={faultTreeModel}
        />
      )}

      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        faultTreeModel={faultTreeModel}
      />

      <LLMConfigModal
        isOpen={showLLMConfigModal}
        onClose={() => setShowLLMConfigModal(false)}
        onConfigChange={handleLLMConfigChange}
      />

      <MatlabExportModal
        isOpen={showMatlabExportModal}
        onClose={() => setShowMatlabExportModal(false)}
        faultTreeModel={faultTreeModel}
        missionTime={missionTime}
      />
    </div>
  );
};

// Funzione per generare il codice del fault tree
const generateFaultTreeCode = (model: FaultTreeModel): string => {
  let code = "// Dynamic Fault Tree Code\n\n";
  
  // Genera codice per eventi base
  code += "// EVENTI BASE\n";
  model.events.forEach(event => {
    code += `BaseEvent ${event.name} {\n`;
    code += `  id: "${event.id}"\n`;
    if (event.description) code += `  description: "${event.description}"\n`;
    if (event.failureRate) code += `  failureRate: ${event.failureRate}\n`;
    
    // Aggiungi distribuzione di probabilità di guasto
    if (event.failureProbabilityDistribution) {
      code += `  failureProbabilityDistribution: {\n`;
      code += `    type: "${event.failureProbabilityDistribution.type}"\n`;
      switch (event.failureProbabilityDistribution.type) {
        case 'exponential':
          code += `    lambda: ${event.failureProbabilityDistribution.lambda} // h⁻¹\n`;
          break;
        case 'weibull':
          code += `    k: ${event.failureProbabilityDistribution.k} // adimensionale\n`;
          code += `    lambda: ${event.failureProbabilityDistribution.lambda} // h\n`;
          code += `    mu: ${event.failureProbabilityDistribution.mu} // h\n`;
          break;
        case 'normal':
          code += `    mu: ${event.failureProbabilityDistribution.mu} // h\n`;
          code += `    sigma: ${event.failureProbabilityDistribution.sigma} // h\n`;
          break;
        case 'constant':
          code += `    probability: ${event.failureProbabilityDistribution.probability} // adimensionale\n`;
          break;
      }
      code += `  }\n`;
    }

    // Aggiungi distribuzione di probabilità di riparazione
    if (event.repairProbabilityDistribution) {
      code += `  repairProbabilityDistribution: {\n`;
      code += `    type: "${event.repairProbabilityDistribution.type}"\n`;
      switch (event.repairProbabilityDistribution.type) {
        case 'exponential':
          code += `    lambda: ${event.repairProbabilityDistribution.lambda} // h⁻¹\n`;
          break;
        case 'weibull':
          code += `    k: ${event.repairProbabilityDistribution.k} // adimensionale\n`;
          code += `    lambda: ${event.repairProbabilityDistribution.lambda} // h\n`;
          code += `    mu: ${event.repairProbabilityDistribution.mu} // h\n`;
          break;
        case 'normal':
          code += `    mu: ${event.repairProbabilityDistribution.mu} // h\n`;
          code += `    sigma: ${event.repairProbabilityDistribution.sigma} // h\n`;
          break;
        case 'constant':
          code += `    probability: ${event.repairProbabilityDistribution.probability} // adimensionale\n`;
          break;
      }
      code += `  }\n`;
    }
    
    if (event.parameters) {
      Object.entries(event.parameters).forEach(([key, value]) => {
        code += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }
    code += "}\n\n";
  });

  // Genera codice per porte
  code += "// PORTE\n";
  model.gates.forEach(gate => {
    code += `Gate ${gate.name} {\n`;
    code += `  id: "${gate.id}"\n`;
    code += `  type: "${gate.gateType}"\n`;
    if (gate.description) code += `  description: "${gate.description}"\n`;
    if (gate.inputs.length > 0) {
      code += `  inputs: [${gate.inputs.map(id => `"${id}"`).join(', ')}]\n`;
    }
    if (gate.parameters) {
      Object.entries(gate.parameters).forEach(([key, value]) => {
        code += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }
    code += "}\n\n";
  });

  // Genera codice per connessioni
  if (model.connections.length > 0) {
    code += "// CONNESSIONI\n";
    model.connections.forEach(conn => {
      code += `Connection: ${conn.source} -> ${conn.target}\n`;
    });
  }

  return code;
};

export default FaultTreeEditor;
