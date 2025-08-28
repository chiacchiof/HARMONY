import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Gate, GateType } from '../../../types/FaultTree';
import './GateNode.css';

interface GateNodeData {
  gate: Gate;
  onClick: () => void;
}

const GateNode: React.FC<NodeProps<GateNodeData>> = ({ data }) => {
  const { gate, onClick } = data;

  const getGateIcon = (gateType: GateType): string => {
    const icons = {
      'AND': '∧',
      'OR': '∨',
      'PAND': '⊕',
      'SPARE': '⟲',
      'SEQ': '→',
      'FDEP': '⟹'
    };
    return icons[gateType];
  };

  const getGateColor = (gateType: GateType): string => {
    const colors = {
      'AND': '#3498db',
      'OR': '#2ecc71',
      'PAND': '#f39c12',
      'SPARE': '#9b59b6',
      'SEQ': '#e67e22',
      'FDEP': '#1abc9c'
    };
    return colors[gateType];
  };

  return (
    <div 
      className="gate-node" 
      onClick={onClick}
      style={{ borderColor: getGateColor(gate.gateType) }}
    >
      <Handle
        type="target"
        position={Position.Bottom}
        className="gate-handle gate-handle-input"
        style={{ backgroundColor: getGateColor(gate.gateType) }}
      />
      
      <Handle
        type="source"
        position={Position.Top}
        className="gate-handle gate-handle-output"
        style={{ backgroundColor: getGateColor(gate.gateType) }}
      />
      
      <div className="gate-content">
        <div 
          className="gate-icon"
          style={{ color: getGateColor(gate.gateType) }}
        >
          {getGateIcon(gate.gateType)}
        </div>
        <div className="gate-info">
          <div className="gate-type">{gate.gateType}</div>
          <div className="gate-name">{gate.name}</div>
          {gate.description && (
            <div className="gate-description">{gate.description}</div>
          )}
          <div className="gate-inputs">
            Inputs: {gate.inputs.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GateNode;
