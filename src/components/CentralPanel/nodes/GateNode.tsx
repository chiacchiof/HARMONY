import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Gate, GateType } from '../../../types/FaultTree';
import './GateNode.css';

interface GateNodeData {
  gate: Gate;
  onClick: () => void;
  onDelete?: (elementId: string) => void;
  isTopEventBadge?: boolean;
}

// Helper per troncare il testo a 30 caratteri
const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const GateNode: React.FC<NodeProps<GateNodeData>> = ({ data }) => {
  const { gate, onClick, onDelete } = data;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(gate.id);
    }
  };

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
      
      {onDelete && (
        <button 
          className="delete-button" 
          onClick={handleDelete}
          title="Elimina porta (e tutti gli elementi collegati)"
        >
          ×
        </button>
      )}
      
      <div className="gate-content">
        <div 
          className="gate-icon"
          style={{ color: getGateColor(gate.gateType) }}
        >
          {getGateIcon(gate.gateType)}
        </div>
        {gate.isTopEvent && (
          <div className="top-event-badge" title="TOP EVENT">TE</div>
        )}
        {gate.isFailureGate && (
          <div className="failure-badge" title="Failure Gate">F</div>
        )}
        <div className="gate-info">
          <div className="gate-type">{gate.gateType}</div>
          <div 
            className="gate-name" 
            title={gate.name}
          >
            {truncateText(gate.name)}
          </div>
          {gate.description && (
            <div 
              className="gate-description" 
              title={gate.description}
            >
              {truncateText(gate.description, 25)}
            </div>
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
