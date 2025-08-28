import React, { useState, useCallback } from 'react';
import MenuBar from '../MenuBar/MenuBar';
import LeftPanel from '../LeftPanel/LeftPanel';
import CentralPanel from '../CentralPanel/CentralPanel';
import RightPanel from '../RightPanel/RightPanel';
import ParameterModal from '../ParameterModal/ParameterModal';
import { FaultTreeModel, BaseEvent, Gate, GateType } from '../../types/FaultTree';
import { FaultTreeModification } from '../../types/ChatIntegration';
import './FaultTreeEditor.css';

const FaultTreeEditor: React.FC = () => {
  const [faultTreeModel, setFaultTreeModel] = useState<FaultTreeModel>({
    events: [],
    gates: [],
    connections: []
  });

  const [selectedElement, setSelectedElement] = useState<BaseEvent | Gate | null>(null);
  const [showParameterModal, setShowParameterModal] = useState(false);

  // Gestione aggiunta eventi base
  const handleAddBaseEvent = useCallback(() => {
    const newEvent: BaseEvent = {
      id: `event-${Date.now()}`,
      type: 'basic-event',
      name: `Evento Base ${faultTreeModel.events.length + 1}`,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      parameters: {}
    };

    setFaultTreeModel(prev => ({
      ...prev,
      events: [...prev.events, newEvent]
    }));
  }, [faultTreeModel.events.length]);

  // Gestione aggiunta porte
  const handleAddGate = useCallback((gateType: GateType) => {
    const newGate: Gate = {
      id: `gate-${Date.now()}`,
      type: 'gate',
      gateType,
      name: `Porta ${gateType} ${faultTreeModel.gates.length + 1}`,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      inputs: [],
      parameters: {}
    };

    setFaultTreeModel(prev => ({
      ...prev,
      gates: [...prev.gates, newGate]
    }));
  }, [faultTreeModel.gates.length]);

  // Gestione click su elemento per aprire parametri
  const handleElementClick = useCallback((element: BaseEvent | Gate) => {
    setSelectedElement(element);
    setShowParameterModal(true);
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
  const handleOpenFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedModel = JSON.parse(e.target?.result as string);
          setFaultTreeModel(loadedModel);
        } catch (error) {
          alert('Errore nel caricamento del file');
        }
      };
      reader.readAsText(file);
    }
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
  }, [faultTreeModel.connections]);

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
              parameters: mod.data.parameters || {}
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
    <div className="fault-tree-editor">
      <MenuBar 
        onSave={handleSaveFile}
        onOpen={handleOpenFile}
        onExportCode={handleExportCode}
      />
      
      <div className="editor-content">
        <LeftPanel 
          onAddBaseEvent={handleAddBaseEvent}
          onAddGate={handleAddGate}
        />
        
        <CentralPanel 
          faultTreeModel={faultTreeModel}
          onElementClick={handleElementClick}
          onModelChange={setFaultTreeModel}
          onDeleteElement={handleDeleteElement}
          onDeleteConnection={handleDeleteConnection}
        />
        
        <RightPanel 
          onGenerateFaultTree={handleGenerateFaultTree}
          onModifyFaultTree={handleModifyFaultTree}
          currentFaultTree={faultTreeModel}
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
        />
      )}
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
