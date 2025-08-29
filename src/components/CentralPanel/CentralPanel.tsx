import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
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

import { FaultTreeModel, BaseEvent, Gate } from '../../types/FaultTree';
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
    gateType?: string;
  } | null;
  isDarkMode: boolean;
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
  componentToPlace: { type: 'event' | 'gate'; gateType?: string } | null;
}> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onPanelClick,
  componentToPlace
}) => {
  const reactFlowInstance = useReactFlow();

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
    
    console.log('Mouse position:', { x: event.clientX, y: event.clientY });
    console.log('Flow position:', flowPosition);
    console.log('Centered position:', centeredPosition);
    
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
      selectionOnDrag={!componentToPlace}
      panOnDrag={componentToPlace ? false : [1, 2]}
      selectionMode={SelectionMode.Partial}
      multiSelectionKeyCode="Control"
      onPaneClick={componentToPlace ? handlePaneClick : undefined}
    >
      <Controls />
      <MiniMap 
        nodeColor="#3498db"
        maskColor="rgba(0, 0, 0, 0.1)"
        position="top-right"
      />
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={20} 
        size={1}
        color="#e0e0e0"
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
  isDarkMode
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
      style: { stroke: '#2c3e50', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2c3e50',
      },
      data: {
        onDelete: onDeleteConnection
      }
    }));
  }, [faultTreeModel.connections, onDeleteConnection]);

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
      style: { stroke: '#2c3e50', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2c3e50',
      },
      data: {
        onDelete: onDeleteConnection
      }
    }, eds));
  }, [faultTreeModel, onModelChange, setEdges]);

  // Gestione spostamento nodi
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Aggiorna le posizioni nel modello
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const updatedModel = { ...faultTreeModel };
        
        // Trova e aggiorna evento base
        const eventIndex = updatedModel.events.findIndex(e => e.id === change.id);
        if (eventIndex !== -1) {
          updatedModel.events[eventIndex] = {
            ...updatedModel.events[eventIndex],
            position: change.position
          };
          onModelChange(updatedModel);
          return;
        }

        // Trova e aggiorna porta
        const gateIndex = updatedModel.gates.findIndex(g => g.id === change.id);
        if (gateIndex !== -1) {
          updatedModel.gates[gateIndex] = {
            ...updatedModel.gates[gateIndex],
            position: change.position
          };
          onModelChange(updatedModel);
        }
      }
    });
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
    if (event.key === 'Delete' || event.key === 'Backspace') {
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
  }, [nodes, edges, onDeleteElement, onDeleteConnection, setNodes, setEdges]);

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
