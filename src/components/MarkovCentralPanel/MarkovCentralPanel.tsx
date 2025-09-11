import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  SelectionMode,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  NodeRemoveChange
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MarkovChainModel, MarkovState, MarkovTransition } from '../../types/MarkovChain';
import StateNode from './nodes/StateNode';
import TransitionEdge from './edges/TransitionEdge';
import './MarkovCentralPanel.css';

interface MarkovCentralPanelProps {
  markovChainModel: MarkovChainModel;
  onElementClick: (element: MarkovState | MarkovTransition) => void;
  onModelChange: (model: MarkovChainModel) => void;
  onDeleteElement: (elementId: string) => void;
  onCreateConnection: (sourceId: string, targetId: string, sourceHandle?: string, targetHandle?: string) => void;
  onPanelClick: (position: { x: number; y: number }) => void;
  componentToPlace: 'state' | null;
  isDarkMode: boolean;
  disableDeletion?: boolean;
}

const nodeTypes = {
  stateNode: StateNode,
};

const edgeTypes = {
  transitionEdge: TransitionEdge,
};

const MarkovCentralPanelContent: React.FC<MarkovCentralPanelProps> = ({
  markovChainModel,
  onElementClick,
  onModelChange,
  onDeleteElement,
  onCreateConnection,
  onPanelClick,
  componentToPlace,
  isDarkMode,
  disableDeletion = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
  }>({ x: 0, y: 0, show: false });

  // Convert Markov chain model to React Flow nodes and edges
  const convertToReactFlowData = useMemo(() => {
    const reactFlowNodes: Node[] = markovChainModel.states.map(state => ({
      id: state.id,
      type: 'stateNode',
      position: state.position,
      data: {
        state,
        onStateClick: onElementClick,
        onDeleteState: onDeleteElement,
        isDarkMode,
        disableDeletion
      },
      dragHandle: '.drag-handle',
      selectable: true
    }));

    const reactFlowEdges: Edge[] = markovChainModel.transitions.map(transition => {
      // Find state names
      const sourceState = markovChainModel.states.find(s => s.id === transition.source);
      const targetState = markovChainModel.states.find(s => s.id === transition.target);
      
      const edge = {
        id: transition.id,
        source: transition.source,
        target: transition.target,
        sourceHandle: transition.sourceHandle,
        targetHandle: transition.targetHandle,
        type: 'transitionEdge',
        data: {
          transition,
          onTransitionClick: onElementClick,
          onDeleteTransition: onDeleteElement,
          isDarkMode,
          disableDeletion,
          sourceStateName: sourceState?.name,
          targetStateName: targetState?.name
        },
        style: {
          stroke: isDarkMode ? '#ffffff' : '#333333',
          strokeWidth: 2
        }
      };
      return edge;
    });

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  }, [markovChainModel, onElementClick, onDeleteElement, isDarkMode, disableDeletion]);

  // Update React Flow nodes and edges when model changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowData;
    setNodes(newNodes);
    setEdges(newEdges);
  }, [convertToReactFlowData, setNodes, setEdges]);

  // Handle node position changes and deletions
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Process deletions first
    const deleteChanges = changes.filter(change => change.type === 'remove');
    deleteChanges.forEach(change => {
      if (change.type === 'remove') {
        onDeleteElement((change as NodeRemoveChange).id);
      }
    });

    // Process other changes (position, selection, etc.)
    const otherChanges = changes.filter(change => change.type !== 'remove');
    onNodesChange(otherChanges);
    
    // Update model with new positions
    otherChanges.forEach(change => {
      if (change.type === 'position' && change.position) {
        const updatedStates = markovChainModel.states.map(state =>
          state.id === change.id 
            ? { ...state, position: change.position! }
            : state
        );
        onModelChange({
          ...markovChainModel,
          states: updatedStates
        });
      }
    });
  }, [onNodesChange, markovChainModel, onModelChange, onDeleteElement]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    
    // Handle edge deletions
    changes.forEach(change => {
      if (change.type === 'remove') {
        onDeleteElement(change.id);
      }
    });
  }, [onEdgesChange, onDeleteElement]);

  // Handle new connections (transitions)
  const handleConnect = useCallback(
    (connection: Connection) => {
      console.log('ReactFlow connection:', connection);
      if (connection.source && connection.target) {
        // Check if connection already exists
        const existingConnection = markovChainModel.transitions.find(
          transition => 
            transition.source === connection.source && 
            transition.target === connection.target
        );

        if (existingConnection) {
          // Show error message
          alert(`Errore: Esiste già una transizione dallo stato ${connection.source} allo stato ${connection.target}.\n\nOgni coppia di stati può essere collegata una sola volta.`);
          return;
        }

        // Check if source and target are the same (self-loop)
        if (connection.source === connection.target) {
          // Self-loops are allowed, just create the connection
          onCreateConnection(connection.source, connection.target, connection.sourceHandle || undefined, connection.targetHandle || undefined);
          return;
        }

        onCreateConnection(connection.source, connection.target, connection.sourceHandle || undefined, connection.targetHandle || undefined);
      }
    },
    [onCreateConnection, markovChainModel.transitions]
  );

  // Handle panel clicks for component placement
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (componentToPlace && reactFlowInstance) {
      // Usa screenToFlowPosition per ottenere la posizione corretta considerando zoom e pan
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      
      // Dimensioni approssimative per centrare il componente
      const componentSize = { width: 120, height: 40 }; // MarkovState tipico
      
      // Centra il componente rispetto al cursore
      const centeredPosition = {
        x: flowPosition.x - (componentSize.width / 2),
        y: flowPosition.y - (componentSize.height / 2)
      };
      
      onPanelClick(centeredPosition);
    }
  }, [componentToPlace, onPanelClick, reactFlowInstance]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disableDeletion) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Find selected nodes and edges
      const selectedNodes = nodes.filter(node => node.selected);
      const selectedEdges = edges.filter(edge => edge.selected);
      
      // Delete selected nodes (states)
      selectedNodes.forEach(node => {
        onDeleteElement(node.id);
      });
      
      // Delete selected edges (transitions)
      selectedEdges.forEach(edge => {
        onDeleteElement(edge.id);
      });
      
      event.preventDefault();
    } else if (event.ctrlKey && event.key === 'a') {
      // Ctrl+A to select all
      event.preventDefault();
      
      // Select all nodes
      setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
      
      // Select all edges
      setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
    }
  }, [nodes, edges, onDeleteElement, setNodes, setEdges, disableDeletion]);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      show: true
    });
  }, []);

  // Hide context menu
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  // Context menu actions
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
    selectedEdges.forEach(edge => onDeleteElement(edge.id));
    
    hideContextMenu();
  }, [nodes, edges, onDeleteElement, hideContextMenu]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', hideContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', hideContextMenu);
    };
  }, [handleKeyDown, hideContextMenu]);

  const proOptions = { hideAttribution: true };

  return (
    <div className={`markov-central-panel ${isDarkMode ? 'dark-mode' : ''} ${componentToPlace ? 'placing-component' : ''}`}>
      <div className="panel-header">
        <h3>Markov Chain Diagram</h3>
        <div className="diagram-info">
          <span>Stati: {markovChainModel.states.length}</span>
          <span>Transizioni: {markovChainModel.transitions.length}</span>
        </div>
        <div className="diagram-help">
          <span>💡 Tasto destro per menu • Trascina per selezione multipla • Ctrl+Click per selezione • Ctrl+A seleziona tutto • DEL/Backspace elimina</span>
        </div>
      </div>
      
      <div 
        className={`react-flow-container ${componentToPlace ? 'placement-mode' : ''}`} 
        onContextMenu={handleContextMenu}
        style={{ cursor: componentToPlace ? 'crosshair' : 'default' }}
      >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={true}
        snapGrid={[15, 15]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Control"
        deleteKeyCode={null}
        selectionOnDrag={!componentToPlace}
        panOnDrag={componentToPlace ? false : [1, 2]}
        fitView
        attributionPosition="bottom-left"
        proOptions={proOptions}
        style={{ cursor: componentToPlace ? 'crosshair' : 'default' }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color={isDarkMode ? '#404040' : '#e0e0e0'}
        />
        <MiniMap
          style={{
            backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`
          }}
          nodeColor={isDarkMode ? '#666' : '#ccc'}
          maskColor={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
          position="top-right"
        />
      </ReactFlow>
      
      {/* Context menu */}
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
      
      {componentToPlace && (
        <div className="placement-hint">
          Click on the canvas to place the selected component
        </div>
      )}
      </div>
    </div>
  );
};

const MarkovCentralPanel: React.FC<MarkovCentralPanelProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MarkovCentralPanelContent {...props} />
    </ReactFlowProvider>
  );
};

export default MarkovCentralPanel;