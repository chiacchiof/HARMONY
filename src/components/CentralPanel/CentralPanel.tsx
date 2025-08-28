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
  EdgeChange,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { FaultTreeModel, BaseEvent, Gate } from '../../types/FaultTree';
import EventNode from './nodes/EventNode';
import GateNode from './nodes/GateNode';
import './CentralPanel.css';

interface CentralPanelProps {
  faultTreeModel: FaultTreeModel;
  onElementClick: (element: BaseEvent | Gate) => void;
  onModelChange: (model: FaultTreeModel) => void;
}

const nodeTypes = {
  eventNode: EventNode,
  gateNode: GateNode,
};

const CentralPanel: React.FC<CentralPanelProps> = ({
  faultTreeModel,
  onElementClick,
  onModelChange
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
          onClick: () => onElementClick(event)
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
          onClick: () => onElementClick(gate)
        },
        draggable: true
      });
    });

    return nodes;
  }, [faultTreeModel, onElementClick]);

  const initialEdges: Edge[] = useMemo(() => {
    return faultTreeModel.connections.map(conn => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2c3e50', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2c3e50',
      }
    }));
  }, [faultTreeModel.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2c3e50', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2c3e50',
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
        const updatedModel = {
          ...faultTreeModel,
          connections: faultTreeModel.connections.filter(conn => conn.id !== change.id)
        };
        
        // Rimuovi anche dall'array inputs della porta
        const removedConnection = faultTreeModel.connections.find(conn => conn.id === change.id);
        if (removedConnection) {
          updatedModel.gates = faultTreeModel.gates.map(gate =>
            gate.id === removedConnection.target
              ? { ...gate, inputs: gate.inputs.filter(input => input !== removedConnection.source) }
              : gate
          );
        }
        
        onModelChange(updatedModel);
      }
    });
  }, [onEdgesChange, faultTreeModel, onModelChange]);

  return (
    <div className="central-panel">
      <div className="panel-header">
        <h3>Fault Tree Diagram</h3>
        <div className="diagram-info">
          <span>Eventi: {faultTreeModel.events.length}</span>
          <span>Porte: {faultTreeModel.gates.length}</span>
          <span>Connessioni: {faultTreeModel.connections.length}</span>
        </div>
      </div>
      
      <div className="react-flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
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
      </div>
    </div>
  );
};

export default CentralPanel;
