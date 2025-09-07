import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeChange,
  NodeRemoveChange,
  EdgeChange,
  MarkerType,
  SelectionMode,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import { FaultTreeModel, BaseEvent, Gate, GateType } from '../../types/FaultTree';
import EventNode from './nodes/EventNode';
import GateNode from './nodes/GateNode';
import DeleteButtonEdge from './edges/DeleteButtonEdge';
import './CentralPanel.css';

interface CentralPanelProps {
  faultTreeModel: FaultTreeModel;
  onElementClick: (element: BaseEvent | Gate) => void;
  onModelChange: (model: FaultTreeModel) => void;
  onDeleteElement: (elementId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onPanelClick: (position: { x: number; y: number }) => void;
  componentToPlace: {
    type: 'event' | 'gate';
    gateType?: GateType;
  } | null;
  isDarkMode: boolean;
  disableDeletion?: boolean;
  onReorganizeComponents: () => void;
}

const nodeTypes = {
  eventNode: EventNode,
  gateNode: GateNode,
};

const edgeTypes = {
  deleteButtonEdge: DeleteButtonEdge,
};

// Componente interno che usa useReactFlow
const ReactFlowComponent: React.FC<{
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  nodeTypes: any;
  edgeTypes: any;
  onPanelClick: (position: { x: number; y: number }) => void;
  componentToPlace: { type: 'event' | 'gate'; gateType?: GateType } | null;
  isDarkMode: boolean;
  onReorganizeComponents: () => void;
}> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onPanelClick,
  componentToPlace,
  isDarkMode,
  onReorganizeComponents
}) => {
  const reactFlowInstance = useReactFlow();
  const [isLocked, setIsLocked] = useState(false);

  // Gestione click sul background per posizionare componenti
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (!componentToPlace) return;
    
    // Usa screenToFlowPosition per ottenere la posizione corretta considerando zoom e pan
    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
    
    // Dimensioni approssimative dei componenti per centrarli
    const componentSizes = {
      event: { width: 135, height: 45 }, // EventNode tipico
      gate: { width: 155, height: 45 }   // GateNode tipico
    };
    
    const size = componentSizes[componentToPlace.type];
    
    // Centra il componente rispetto al cursore
    const centeredPosition = {
      x: flowPosition.x - (size.width / 2),
      y: flowPosition.y - (size.height / 2)
    };
    
    
    onPanelClick(centeredPosition);
  }, [componentToPlace, onPanelClick, reactFlowInstance]);

  return (
         <ReactFlow
       nodes={nodes}
       edges={edges}
       onNodesChange={onNodesChange}
       onEdgesChange={onEdgesChange}
       onConnect={onConnect}
       nodeTypes={nodeTypes}
       edgeTypes={edgeTypes}
       fitView
       attributionPosition="bottom-left"
       deleteKeyCode={null}
       selectionOnDrag={!componentToPlace && !isLocked}
       panOnDrag={componentToPlace || isLocked ? false : [1, 2]}
       selectionMode={SelectionMode.Partial}
       multiSelectionKeyCode="Control"
       onPaneClick={componentToPlace ? handlePaneClick : undefined}
     >
             {/* Controlli personalizzati che includono il pulsante Riorganizza */}
       <div className="react-flow__panel react-flow__controls bottom left">
         <button
           className="react-flow__controls-button"
           onClick={() => reactFlowInstance.zoomIn()}
           title="Zoom In (+)"
         >
           +
         </button>
         <button
           className="react-flow__controls-button"
           onClick={() => reactFlowInstance.zoomOut()}
           title="Zoom Out (-)"
         >
           -
         </button>
         <button
           className="react-flow__controls-button"
           onClick={() => reactFlowInstance.fitView()}
           title="Fit View"
         >
           ⊞
         </button>
         <button
           className="react-flow__controls-button"
           onClick={() => setIsLocked(!isLocked)}
           title={isLocked ? "Sblocca Vista" : "Blocca Vista"}
         >
           {isLocked ? "🔓" : "🔒"}
         </button>
         <button
           className="react-flow__controls-button"
           onClick={() => {
             onReorganizeComponents();
             // Dopo la riorganizzazione, chiama fit view
             setTimeout(() => {
               reactFlowInstance.fitView();
             }, 100);
           }}
           title="Riorganizza tutti i componenti al centro"
         >
           🔧
         </button>
       </div>
       
       <MiniMap 
         nodeColor="#3498db"
         maskColor="rgba(0, 0, 0, 0.1)"
         position="top-right"
       />
       <Background 
         variant={BackgroundVariant.Dots} 
         gap={20} 
         size={1}
         color={isDarkMode ? "#404040" : "#e0e0e0"}
       />
    </ReactFlow>
  );
};

const CentralPanel: React.FC<CentralPanelProps> = ({
  faultTreeModel,
  onElementClick,
  onModelChange,
  onDeleteElement,
  onDeleteConnection,
  onPanelClick,
  componentToPlace,
  isDarkMode,
  disableDeletion = false,
  onReorganizeComponents
}) => {
  // Converti il modello in nodi e edge di React Flow
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    
    // Aggiungi eventi base
    faultTreeModel.events.forEach(event => {
      nodes.push({
        id: event.id,
        type: 'eventNode',
        position: event.position,
        data: {
          event,
          onClick: () => onElementClick(event),
          onDelete: onDeleteElement
        },
        draggable: true
      });
    });

    // Aggiungi porte
    faultTreeModel.gates.forEach(gate => {
      nodes.push({
        id: gate.id,
        type: 'gateNode',
        position: gate.position,
        data: {
          gate,
          onClick: () => onElementClick(gate),
          onDelete: onDeleteElement
        },
        draggable: true
      });
    });

    return nodes;
  }, [faultTreeModel, onElementClick, onDeleteElement]);

  const initialEdges: Edge[] = useMemo(() => {
    return faultTreeModel.connections.map(conn => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      type: 'deleteButtonEdge',
      animated: true,
      style: { 
        stroke: isDarkMode ? '#e0e0e0' : '#2c3e50', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDarkMode ? '#e0e0e0' : '#2c3e50',
      },
      data: {
        onDelete: onDeleteConnection
      }
    }));
  }, [faultTreeModel.connections, onDeleteConnection, isDarkMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Stato per menu contestuale
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    show: boolean;
  }>({ x: 0, y: 0, show: false });

  // Aggiorna i nodi quando il modello cambia
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Aggiorna gli edge quando il modello cambia
  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Gestione connessione tra nodi
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newConnection = {
      id: `conn-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: 'connection' as const
    };

    // Aggiorna il modello
    const updatedModel = {
      ...faultTreeModel,
      connections: [...faultTreeModel.connections, newConnection]
    };

    // Aggiorna anche gli input della porta target se è una porta
    const targetGate = faultTreeModel.gates.find(g => g.id === connection.target);
    if (targetGate && connection.source && !targetGate.inputs.includes(connection.source)) {
      updatedModel.gates = faultTreeModel.gates.map(gate =>
        gate.id === connection.target && connection.source
          ? { ...gate, inputs: [...gate.inputs, connection.source] }
          : gate
      );
    }

    onModelChange(updatedModel);

    // Aggiorna React Flow
    setEdges((eds) => addEdge({
      ...connection,
      id: newConnection.id,
      type: 'deleteButtonEdge',
      animated: true,
      style: { 
        stroke: isDarkMode ? '#e0e0e0' : '#2c3e50', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDarkMode ? '#e0e0e0' : '#2c3e50',
      },
      data: {
        onDelete: onDeleteConnection
      }
    }, eds));
  }, [faultTreeModel, onModelChange, onDeleteConnection, setEdges, isDarkMode]);

  // Gestione spostamento nodi
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Prima applica i cambiamenti a React Flow
    onNodesChange(changes);
    
    // Filtra solo i cambiamenti di posizione validi
    const positionChanges = changes.filter(change => 
      change.type === 'position' && 
      change.position &&
      typeof change.position.x === 'number' && 
      typeof change.position.y === 'number' &&
      Number.isFinite(change.position.x) &&
      Number.isFinite(change.position.y)
    );
    
    if (positionChanges.length === 0) return;
    
    // Verifica che non stiamo perdendo elementi durante l'aggiornamento
    const currentTotalElements = faultTreeModel.events.length + faultTreeModel.gates.length;
    if (currentTotalElements === 0) {
      console.warn('⚠️ Skipping position update: no elements in model');
      return;
    }
    
    // Aggiorna tutte le posizioni in una singola operazione per evitare race conditions
    const updatedModel = {
      ...faultTreeModel,
      // Deep clone degli array per evitare mutazioni accidentali
      events: [...faultTreeModel.events],
      gates: [...faultTreeModel.gates],
      connections: [...faultTreeModel.connections]
    };
    
    let hasChanges = false;
    
    positionChanges.forEach(change => {
      // Type guard: sappiamo che è un NodePositionChange perché filtrato
      if (change.type !== 'position' || !change.position) return;
      
      const position = change.position;
      
      // Trova e aggiorna evento base
      const eventIndex = updatedModel.events.findIndex(e => e.id === change.id);
      if (eventIndex !== -1) {
        updatedModel.events[eventIndex] = {
          ...updatedModel.events[eventIndex],
          position
        };
        hasChanges = true;
        return;
      }

      // Trova e aggiorna porta
      const gateIndex = updatedModel.gates.findIndex(g => g.id === change.id);
      if (gateIndex !== -1) {
        updatedModel.gates[gateIndex] = {
          ...updatedModel.gates[gateIndex],
          position
        };
        hasChanges = true;
      }
    });
    
    // Verifica finale: non aggiornare se abbiamo perso elementi
    const finalTotalElements = updatedModel.events.length + updatedModel.gates.length;
    if (finalTotalElements !== currentTotalElements) {
      console.error('⚠️ Element count mismatch! Skipping update', {
        original: currentTotalElements,
        updated: finalTotalElements,
        changes: positionChanges
      });
      return;
    }
    
    // Chiama onModelChange solo se ci sono stati cambiamenti validi
    if (hasChanges) {
      onModelChange(updatedModel);
    }
  }, [onNodesChange, faultTreeModel, onModelChange]);

  // Gestione eliminazione edge
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    
    changes.forEach(change => {
      if (change.type === 'remove') {
        // Usa la funzione di cancellazione dedicata
        onDeleteConnection(change.id);
      }
    });
  }, [onEdgesChange, onDeleteConnection]);

  // Gestione eliminazione nodi
  const handleNodesChangeWithDelete = useCallback((changes: NodeChange[]) => {
    // Prima processa le eliminazioni
    const deleteChanges = changes.filter(change => change.type === 'remove');
    deleteChanges.forEach(change => {
      // Type guard per NodeRemoveChange
      if (change.type === 'remove') {
        onDeleteElement((change as NodeRemoveChange).id);
      }
    });

    // Poi processa gli altri cambiamenti (posizione, selezione, etc.)
    const otherChanges = changes.filter(change => change.type !== 'remove');
    if (otherChanges.length > 0) {
      handleNodesChange(otherChanges);
    }
  }, [handleNodesChange, onDeleteElement]);

  // Gestione tasti
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disableDeletion) return;

    if (event.key === 'Delete') {
      // Trova i nodi selezionati
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      // Elimina i nodi selezionati
      selectedNodes.forEach(node => {
        onDeleteElement(node.id);
      });
      
      // Elimina gli edge selezionati
      selectedEdges.forEach(edge => {
        onDeleteConnection(edge.id);
      });
      
      event.preventDefault();
    } else if (event.ctrlKey && event.key === 'a') {
      // Ctrl+A per selezionare tutto
      event.preventDefault();
      
      // Seleziona tutti i nodi
      setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
      
      // Seleziona tutti gli edge
      setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
    }
  }, [nodes, edges, onDeleteElement, onDeleteConnection, setNodes, setEdges, disableDeletion]);

  // Gestione menu contestuale
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      show: true
    });
  }, []);

  // Nascondi menu contestuale
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  // Azioni del menu contestuale
  const handleSelectAll = useCallback(() => {
    setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
    setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
    hideContextMenu();
  }, [setNodes, setEdges, hideContextMenu]);

  const handleDeselectAll = useCallback(() => {
    setNodes(nodes => nodes.map(node => ({ ...node, selected: false })));
    setEdges(edges => edges.map(edge => ({ ...edge, selected: false })));
    hideContextMenu();
  }, [setNodes, setEdges, hideContextMenu]);

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);
    
    selectedNodes.forEach(node => onDeleteElement(node.id));
    selectedEdges.forEach(edge => onDeleteConnection(edge.id));
    
    hideContextMenu();
  }, [nodes, edges, onDeleteElement, onDeleteConnection, hideContextMenu]);



  // Aggiungi listener per tasti
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', hideContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', hideContextMenu);
    };
  }, [handleKeyDown, hideContextMenu]);

  return (
    <div className={`central-panel ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="panel-header">
        <h3>Fault Tree Diagram</h3>
        <div className="diagram-info">
          <span>Eventi: {faultTreeModel.events.length}</span>
          <span>Porte: {faultTreeModel.gates.length}</span>
          <span>Connessioni: {faultTreeModel.connections.length}</span>
        </div>
        <div className="diagram-help">
          <span>💡 Tasto destro per menu • Trascina per selezione multipla • Ctrl+Click per selezione • Ctrl+A seleziona tutto • DEL/Backspace elimina</span>
        </div>
      </div>
      
      <div 
        className={`react-flow-container ${componentToPlace ? 'placement-mode' : ''}`} 
        onContextMenu={handleContextMenu}
      >
        <ReactFlowProvider>
                     <ReactFlowComponent
             nodes={nodes}
             edges={edges}
             onNodesChange={handleNodesChangeWithDelete}
             onEdgesChange={handleEdgesChange}
             onConnect={onConnect}
             nodeTypes={nodeTypes}
             edgeTypes={edgeTypes}
             onPanelClick={onPanelClick}
             componentToPlace={componentToPlace}
             isDarkMode={isDarkMode}
             onReorganizeComponents={onReorganizeComponents}
           />
        </ReactFlowProvider>
        
        {/* Menu contestuale */}
        {contextMenu.show && (
          <div 
            className="context-menu"
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000
            }}
          >
            <button onClick={handleSelectAll}>
              🔲 Seleziona tutto (Ctrl+A)
            </button>
            <button onClick={handleDeselectAll}>
              ⬜ Deseleziona tutto
            </button>
            <hr />
            <button 
              onClick={handleDeleteSelected}
              disabled={!nodes.some(n => n.selected) && !edges.some(e => e.selected)}
            >
              🗑️ Elimina selezionati (Del)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CentralPanel;
