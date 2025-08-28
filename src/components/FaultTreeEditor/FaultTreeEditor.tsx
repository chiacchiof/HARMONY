import React, { useState, useCallback } from 'react';
import MenuBar from '../MenuBar/MenuBar';
import LeftPanel from '../LeftPanel/LeftPanel';
import CentralPanel from '../CentralPanel/CentralPanel';
import RightPanel from '../RightPanel/RightPanel';
import ParameterModal from '../ParameterModal/ParameterModal';
import { FaultTreeModel, BaseEvent, Gate, GateType } from '../../types/FaultTree';
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
        />
        
        <RightPanel />
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
