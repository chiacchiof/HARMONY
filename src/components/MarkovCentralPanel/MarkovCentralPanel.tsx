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
  MarkerType,
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
  onCreateConnection: (sourceId: string, targetId: string) => void;
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
  const { project } = useReactFlow();

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

    const reactFlowEdges: Edge[] = markovChainModel.transitions.map(transition => ({
      id: transition.id,
      source: transition.source,
      target: transition.target,
      type: 'transitionEdge',
      data: {
        transition,
        onTransitionClick: onElementClick,
        onDeleteTransition: onDeleteElement,
        isDarkMode,
        disableDeletion
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: isDarkMode ? '#ffffff' : '#000000'
      },
      animated: true,
      style: {
        stroke: isDarkMode ? '#ffffff' : '#000000',
        strokeWidth: 2
      }
    }));

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
      if (connection.source && connection.target) {
        onCreateConnection(connection.source, connection.target);
      }
    },
    [onCreateConnection]
  );

  // Handle panel clicks for component placement
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (componentToPlace) {
      const position = project({
        x: event.clientX - 200, // Adjust for panel offset
        y: event.clientY - 100
      });
      onPanelClick(position);
    }
  }, [componentToPlace, project, onPanelClick]);

  const proOptions = { hideAttribution: true };

  return (
    <div className={`markov-central-panel ${isDarkMode ? 'dark-mode' : ''}`}>
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
        className={componentToPlace ? 'placing-component' : ''}
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