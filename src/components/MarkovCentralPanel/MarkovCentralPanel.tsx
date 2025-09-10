import React, { useCallback, useMemo, useEffect } from 'react';
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
  ReactFlowProvider
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
      selectable: !disableDeletion
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

  // Handle node position changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    // Update model with new positions
    changes.forEach(change => {
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
  }, [onNodesChange, markovChainModel, onModelChange]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

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

  const proOptions = { hideAttribution: true };

  return (
    <div 
      className={`markov-central-panel ${isDarkMode ? 'dark-mode' : ''} ${componentToPlace ? 'placing-component' : ''}`}
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
        multiSelectionKeyCode="Shift"
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
      
      {componentToPlace && (
        <div className="placement-hint">
          Click on the canvas to place the selected component
        </div>
      )}
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